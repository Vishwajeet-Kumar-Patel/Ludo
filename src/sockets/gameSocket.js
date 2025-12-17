const redis = require('../services/redisService');
const logger = require('../config/logger');
const config = require('../config');
const GameHistory = require('../models/GameHistory');
const UserStats = require('../models/UserStats');

class GameSocketHandler {
    constructor(io) {
        this.io = io;
        this.rooms = {};
        this.playerSockets = new Map(); // userId -> socketId
        this.socketPlayers = new Map(); // socketId -> userId
        this.disconnectTimers = new Map(); // userId -> timeoutId
    }

    handleConnection(socket) {
        logger.info(`New client connected: ${socket.id}`);

        // Game events
        socket.on('joinGame', (data) => this.handleJoinGame(socket, data));
        socket.on('leaveGame', (data) => this.handleLeaveGame(socket, data));
        socket.on('moveToken', (data) => this.handleMoveToken(socket, data));
        socket.on('rollDice', (data) => this.handleRollDice(socket, data));
        socket.on('playerReady', (data) => this.handlePlayerReady(socket, data));
        
        // Reconnection handling
        socket.on('reconnect_player', (data) => this.handleReconnection(socket, data));
        socket.on('heartbeat', () => this.handleHeartbeat(socket));
        
        // Disconnect
        socket.on('disconnect', () => this.handleDisconnect(socket));
    }

    async handleJoinGame(socket, data) {
        try {
            const playerData = typeof data === 'string' ? JSON.parse(data) : data;
            const { userId, playerId, playerName, playerImageId, maxPlayers, gameWinAmount, gameJoinAmount, gameMode } = playerData;

            // Acquire lock to prevent race conditions
            const lockToken = await redis.acquireLock(`game:join:${userId}`, 5);
            if (!lockToken) {
                socket.emit('joinError', { message: 'Please wait, processing your request...' });
                return;
            }

            try {
                // Check if player is already in a game
                const existingRoom = await this.findPlayerRoom(userId);
                if (existingRoom) {
                    socket.join(existingRoom);
                    socket.emit('rejoinRoom', {
                        roomId: existingRoom,
                        roomData: this.rooms[existingRoom]
                    });
                    return;
                }

                // Find or create room
                let chosenRoom = await this.findAvailableRoom(maxPlayers);
                
                if (!chosenRoom) {
                    chosenRoom = this.generateRoomId();
                    this.rooms[chosenRoom] = {
                        roomId: chosenRoom,
                        players: [],
                        playerData: {},
                        maxPlayers: maxPlayers || config.game.maxPlayersPerRoom,
                        gameWinAmount,
                        gameJoinAmount,
                        gameMode,
                        status: 'waiting',
                        createdAt: Date.now()
                    };
                    
                    // Cache in Redis
                    await redis.set(`room:${chosenRoom}`, JSON.stringify(this.rooms[chosenRoom]));
                }

                // Add player to room
                await this.addPlayerToRoom(chosenRoom, socket, playerData);
                
                // Store socket mapping
                this.playerSockets.set(userId, socket.id);
                this.socketPlayers.set(socket.id, userId);

                logger.info(`Player ${userId} joined room ${chosenRoom}`);
                
                // Check if room is full and start game
                if (this.rooms[chosenRoom].players.length >= this.rooms[chosenRoom].maxPlayers) {
                    this.startGame(chosenRoom);
                }
            } finally {
                await redis.releaseLock(`game:join:${userId}`, lockToken);
            }
        } catch (error) {
            logger.error('Join game error:', error);
            socket.emit('joinError', { message: 'Failed to join game' });
        }
    }

    async addPlayerToRoom(roomId, socket, playerData) {
        const room = this.rooms[roomId];
        const { userId, playerId, playerName, playerImageId } = playerData;

        if (room.players.includes(userId)) {
            return; // Already in room
        }

        const playerIndex = room.players.length;
        const playerKeys = ['Player1', 'Player2', 'Player3', 'Player4'];
        const playerKey = playerKeys[playerIndex];

        // Generate player path
        const startTiles = [1, 14, 27, 40];
        const homePaths = [
            [53, 54, 55, 56, 57],
            [58, 59, 60, 61, 62],
            [63, 64, 65, 66, 67],
            [68, 69, 70, 71, 72]
        ];
        const playerPath = this.generatePlayerPath(startTiles[playerIndex], homePaths[playerIndex]);

        room.players.push(userId);
        room.playerData[userId] = {
            socketId: socket.id,
            playerId,
            name: playerName,
            imageId: playerImageId,
            playerKey,
            playerIndex,
            path: playerPath,
            tokens: [
                { tokenID: 't1', tokenPos: '-1', isSafe: true },
                { tokenID: 't2', tokenPos: '-1', isSafe: true },
                { tokenID: 't3', tokenPos: '-1', isSafe: true },
                { tokenID: 't4', tokenPos: '-1', isSafe: true }
            ],
            score: 0,
            isReady: false,
            isConnected: true
        };

        socket.join(roomId);

        // Cache in Redis
        await redis.hSet(`room:${roomId}:players`, userId, JSON.stringify(room.playerData[userId]));
        await redis.set(`room:${roomId}`, JSON.stringify(room));

        // Notify all players in room
        this.io.to(roomId).emit('playerJoined', {
            roomId,
            players: room.players,
            playerData: room.playerData,
            newPlayer: {
                userId,
                name: playerName,
                playerKey
            }
        });
    }

    async handleReconnection(socket, data) {
        try {
            const { userId, roomId } = typeof data === 'string' ? JSON.parse(data) : data;

            logger.info(`Player ${userId} attempting to reconnect to room ${roomId}`);

            // Clear disconnect timer if exists
            if (this.disconnectTimers.has(userId)) {
                clearTimeout(this.disconnectTimers.get(userId));
                this.disconnectTimers.delete(userId);
            }

            // Check if room exists
            if (!this.rooms[roomId]) {
                // Try to load from Redis
                const roomData = await redis.get(`room:${roomId}`);
                if (roomData) {
                    this.rooms[roomId] = JSON.parse(roomData);
                } else {
                    socket.emit('reconnectFailed', { message: 'Room not found' });
                    return;
                }
            }

            const room = this.rooms[roomId];
            
            // Check if player was in this room
            if (!room.players.includes(userId)) {
                socket.emit('reconnectFailed', { message: 'You were not in this room' });
                return;
            }

            // Update player data
            if (room.playerData[userId]) {
                room.playerData[userId].socketId = socket.id;
                room.playerData[userId].isConnected = true;
            }

            // Update socket mapping
            this.playerSockets.set(userId, socket.id);
            this.socketPlayers.set(socket.id, userId);

            socket.join(roomId);

            // Send full game state to reconnected player
            socket.emit('reconnectSuccess', {
                roomId,
                roomData: room,
                yourPlayerData: room.playerData[userId]
            });

            // Notify other players
            socket.to(roomId).emit('playerReconnected', {
                userId,
                playerName: room.playerData[userId].name
            });

            logger.info(`Player ${userId} successfully reconnected to room ${roomId}`);
        } catch (error) {
            logger.error('Reconnection error:', error);
            socket.emit('reconnectFailed', { message: 'Reconnection failed' });
        }
    }

    async handleDisconnect(socket) {
        try {
            const userId = this.socketPlayers.get(socket.id);
            if (!userId) return;

            logger.info(`Client disconnected: ${socket.id}, userId: ${userId}`);

            const roomId = await this.findPlayerRoom(userId);
            if (!roomId || !this.rooms[roomId]) return;

            const room = this.rooms[roomId];

            // Mark player as disconnected
            if (room.playerData[userId]) {
                room.playerData[userId].isConnected = false;
            }

            // Notify other players
            this.io.to(roomId).emit('playerDisconnected', {
                userId,
                playerName: room.playerData[userId]?.name
            });

            // Set timer to remove player if they don't reconnect
            const disconnectTimer = setTimeout(async () => {
                await this.removePlayerFromRoom(roomId, userId);
                this.disconnectTimers.delete(userId);
            }, config.game.reconnectionTimeout);

            this.disconnectTimers.set(userId, disconnectTimer);
            
        } catch (error) {
            logger.error('Disconnect handling error:', error);
        }
    }

    async removePlayerFromRoom(roomId, userId) {
        try {
            const room = this.rooms[roomId];
            if (!room) return;

            // Remove player
            room.players = room.players.filter(id => id !== userId);
            delete room.playerData[userId];

            // Clean up mappings
            const socketId = this.playerSockets.get(userId);
            if (socketId) {
                this.playerSockets.delete(userId);
                this.socketPlayers.delete(socketId);
            }

            // Update Redis
            await redis.hDel(`room:${roomId}:players`, userId);
            await redis.set(`room:${roomId}`, JSON.stringify(room));

            // Notify remaining players
            this.io.to(roomId).emit('playerLeft', {
                userId,
                remainingPlayers: room.players
            });

            // Delete room if empty
            if (room.players.length === 0) {
                delete this.rooms[roomId];
                await redis.delPattern(`room:${roomId}*`);
                logger.info(`Room ${roomId} deleted (empty)`);
            }

            logger.info(`Player ${userId} removed from room ${roomId}`);
        } catch (error) {
            logger.error('Remove player error:', error);
        }
    }

    async handleRollDice(socket, data) {
        try {
            const { roomId, userId } = data;
            const room = this.rooms[roomId];

            if (!room || room.status !== 'playing') {
                return socket.emit('rollError', { message: 'Game not active' });
            }

            // Check if it's the player's turn
            if (room.currentPlayer !== userId) {
                return socket.emit('rollError', { message: 'Not your turn' });
            }

            // Roll dice (1-6)
            const diceValue = Math.floor(Math.random() * 6) + 1;
            
            // Check if player has any valid moves
            const validMoves = this.getValidMoves(room, userId, diceValue);
            
            // Emit dice result to all players in room
            this.io.to(roomId).emit('diceRolled', {
                userId,
                diceValue,
                validMoves,
                timestamp: Date.now()
            });

            // Store dice value temporarily for move validation
            room.lastDiceRoll = {
                userId,
                value: diceValue,
                validMoves,
                timestamp: Date.now()
            };

            // If no valid moves, skip turn after a delay
            if (validMoves.length === 0) {
                setTimeout(() => {
                    this.nextTurn(roomId);
                }, 2000);
            }

            logger.info(`Player ${userId} rolled ${diceValue} in room ${roomId}`);
        } catch (error) {
            logger.error('Roll dice error:', error);
            socket.emit('rollError', { message: 'Failed to roll dice' });
        }
    }

    async handleMoveToken(socket, data) {
        try {
            const { roomId, userId, tokenIndex } = data;
            const room = this.rooms[roomId];

            if (!room || room.status !== 'playing') {
                return socket.emit('moveError', { message: 'Game not active' });
            }

            if (room.currentPlayer !== userId) {
                return socket.emit('moveError', { message: 'Not your turn' });
            }

            const lastRoll = room.lastDiceRoll;
            if (!lastRoll || lastRoll.userId !== userId) {
                return socket.emit('moveError', { message: 'Roll dice first' });
            }

            // Validate move
            if (!lastRoll.validMoves.includes(tokenIndex)) {
                return socket.emit('moveError', { message: 'Invalid move' });
            }

            // Execute the move
            const moveResult = this.moveToken(room, userId, tokenIndex, lastRoll.value);

            if (!moveResult.success) {
                return socket.emit('moveError', { message: moveResult.reason });
            }

            // Check for kills
            const kills = this.checkKills(room, userId, moveResult.newPosition);

            // Update room state in Redis
            await redis.set(`room:${roomId}`, JSON.stringify(room));

            // Emit move to all players
            this.io.to(roomId).emit('tokenMoved', {
                userId,
                tokenIndex,
                oldPosition: moveResult.oldPosition,
                newPosition: moveResult.newPosition,
                diceValue: lastRoll.value,
                kills,
                timestamp: Date.now()
            });

            // Record move in database
            GameHistory.recordMove(roomId, userId, {
                action: 'move',
                tokenIndex,
                diceValue: lastRoll.value,
                oldPosition: moveResult.oldPosition,
                newPosition: moveResult.newPosition,
                kills: kills.length
            }).catch(err => logger.error('Failed to record move:', err));

            // Emit kills if any
            if (kills.length > 0) {
                this.io.to(roomId).emit('tokensKilled', { kills });
            }

            // Check win condition
            const hasWon = this.checkWinCondition(room, userId);
            if (hasWon) {
                this.handleGameWin(roomId, userId);
                return;
            }

            // Clear last dice roll
            room.lastDiceRoll = null;

            // Next turn (unless player rolled a 6, they get another turn)
            if (lastRoll.value === 6) {
                this.io.to(roomId).emit('bonusTurn', { userId });
            } else {
                this.nextTurn(roomId);
            }

            logger.info(`Player ${userId} moved token ${tokenIndex} in room ${roomId}`);
        } catch (error) {
            logger.error('Move token error:', error);
            socket.emit('moveError', { message: 'Failed to move token' });
        }
    }

    getValidMoves(room, userId, diceValue) {
        const playerData = room.playerData[userId];
        if (!playerData) return [];

        const validMoves = [];
        const path = playerData.path;
        const SAFE_CELLS = [1, 9, 14, 22, 27, 35, 40, 48];

        for (let i = 0; i < playerData.tokens.length; i++) {
            const token = playerData.tokens[i];
            const currentPos = parseInt(token.tokenPos);

            // Token in home
            if (currentPos === -1) {
                if (diceValue === 6) {
                    validMoves.push(i);
                }
                continue;
            }

            // Calculate new position
            const newPos = currentPos + diceValue;

            // Check if move is valid (not overshooting)
            if (newPos < path.length) {
                validMoves.push(i);
            }
        }

        return validMoves;
    }

    moveToken(room, userId, tokenIndex, diceValue) {
        const playerData = room.playerData[userId];
        const token = playerData.tokens[tokenIndex];
        const path = playerData.path;
        const currentPos = parseInt(token.tokenPos);

        // Token in home
        if (currentPos === -1) {
            if (diceValue !== 6) {
                return { success: false, reason: 'Need 6 to leave home' };
            }
            token.tokenPos = '0';
            token.isSafe = true;
            return {
                success: true,
                oldPosition: -1,
                newPosition: path[0],
                pathIndex: 0
            };
        }

        // Normal move
        const newPos = currentPos + diceValue;

        if (newPos >= path.length) {
            return { success: false, reason: 'Move overshoots path' };
        }

        const SAFE_CELLS = [1, 9, 14, 22, 27, 35, 40, 48];
        const newTile = path[newPos];

        token.tokenPos = newPos.toString();
        token.isSafe = SAFE_CELLS.includes(newTile) || newPos >= 52;

        return {
            success: true,
            oldPosition: path[currentPos],
            newPosition: newTile,
            pathIndex: newPos
        };
    }

    checkKills(room, attackerUserId, tile) {
        const SAFE_CELLS = [1, 9, 14, 22, 27, 35, 40, 48];
        
        // Can't kill on safe cells
        if (SAFE_CELLS.includes(tile)) {
            return [];
        }

        const kills = [];

        // Check all other players
        for (const userId of room.players) {
            if (userId === attackerUserId) continue;

            const playerData = room.playerData[userId];
            const path = playerData.path;

            // Check each token
            for (let i = 0; i < playerData.tokens.length; i++) {
                const token = playerData.tokens[i];
                const pos = parseInt(token.tokenPos);

                if (pos < 0 || pos >= 52) continue; // Skip home or final stretch

                const tokenTile = path[pos];

                // Same tile and not in home stretch
                if (tokenTile === tile) {
                    // Kill the token
                    token.tokenPos = '-1';
                    token.isSafe = true;

                    kills.push({
                        killedPlayer: userId,
                        killedToken: i,
                        tile
                    });

                    logger.info(`Token killed: Player ${userId}, Token ${i} at tile ${tile}`);
                }
            }
        }

        return kills;
    }

    checkWinCondition(room, userId) {
        const playerData = room.playerData[userId];
        const path = playerData.path;
        const finalIndex = path.length - 1;

        // All tokens must reach the final position
        return playerData.tokens.every(token => {
            return parseInt(token.tokenPos) === finalIndex;
        });
    }

    async handleGameWin(roomId, winnerId) {
        const room = this.rooms[roomId];
        room.status = 'finished';
        room.winner = winnerId;
        room.finishedAt = Date.now();

        const finalStandings = this.calculateFinalStandings(room);

        this.io.to(roomId).emit('gameOver', {
            winner: winnerId,
            winnerName: room.playerData[winnerId].name,
            finalStandings,
            timestamp: Date.now()
        });

        // Save game result to database
        try {
            await GameHistory.finishGame(roomId, winnerId, finalStandings);

            // Update statistics for all players
            for (const standing of finalStandings) {
                await UserStats.updateStats(standing.userId, {
                    won: standing.userId === winnerId,
                    score: standing.score,
                    tokensFinished: standing.tokensFinished
                });
            }
        } catch (error) {
            logger.error('Failed to save game results:', error);
        }

        logger.info(`Game finished in room ${roomId}, winner: ${winnerId}`);

        // Clean up room after 30 seconds
        setTimeout(() => {
            this.cleanupRoom(roomId);
        }, 30000);
    }

    calculateFinalStandings(room) {
        return room.players.map(userId => {
            const playerData = room.playerData[userId];
            const tokensFinished = playerData.tokens.filter(t => 
                parseInt(t.tokenPos) === playerData.path.length - 1
            ).length;

            return {
                userId,
                name: playerData.name,
                tokensFinished,
                score: tokensFinished * 25
            };
        }).sort((a, b) => b.tokensFinished - a.tokensFinished);
    }

    nextTurn(roomId) {
        const room = this.rooms[roomId];
        
        // Move to next player
        room.currentTurn = (room.currentTurn + 1) % room.players.length;
        room.currentPlayer = room.players[room.currentTurn];

        this.io.to(roomId).emit('turnChanged', {
            currentPlayer: room.currentPlayer,
            currentPlayerName: room.playerData[room.currentPlayer].name,
            turnNumber: room.currentTurn + 1
        });

        logger.info(`Turn changed in room ${roomId} to player ${room.currentPlayer}`);
    }

    cleanupRoom(roomId) {
        const room = this.rooms[roomId];
        if (room) {
            // Clear all player mappings
            for (const userId of room.players) {
                this.playerSockets.delete(userId);
                const socketId = room.playerData[userId]?.socketId;
                if (socketId) {
                    this.socketPlayers.delete(socketId);
                }
            }

            // Delete room
            delete this.rooms[roomId];
            redis.del(`room:${roomId}`);

            logger.info(`Room ${roomId} cleaned up`);
        }
    }

    async handlePlayerReady(socket, data) {
        const { roomId, userId } = data;
        const room = this.rooms[roomId];
        
        if (room && room.playerData[userId]) {
            room.playerData[userId].isReady = true;
            
            this.io.to(roomId).emit('playerReady', {
                userId,
                playerName: room.playerData[userId].name
            });

            // Check if all players are ready
            const allReady = room.players.every(id => room.playerData[id].isReady);
            if (allReady && room.status === 'waiting') {
                this.startGame(roomId);
            }
        }
    }

    handleHeartbeat(socket) {
        const userId = this.socketPlayers.get(socket.id);
        if (userId) {
            socket.emit('heartbeat_ack');
        }
    }

    startGame(roomId) {
        const room = this.rooms[roomId];
        room.status = 'playing';
        room.startedAt = Date.now();
        room.currentTurn = 0;
        room.currentPlayer = room.players[0];

        // Create game history record
        GameHistory.createGame(roomId, room.players, {
            maxPlayers: room.maxPlayers,
            playerData: room.playerData
        }).catch(err => logger.error('Failed to create game history:', err));

        this.io.to(roomId).emit('gameStarted', {
            roomId,
            players: room.players,
            playerData: room.playerData,
            currentPlayer: room.currentPlayer
        });

        logger.info(`Game started in room ${roomId}`);
    }

    async findPlayerRoom(userId) {
        for (const roomId in this.rooms) {
            if (this.rooms[roomId].players.includes(userId)) {
                return roomId;
            }
        }
        return null;
    }

    async findAvailableRoom(maxPlayers) {
        for (const roomId in this.rooms) {
            const room = this.rooms[roomId];
            if (room.status === 'waiting' && 
                room.players.length < room.maxPlayers &&
                room.maxPlayers === maxPlayers) {
                return roomId;
            }
        }
        return null;
    }

    generateRoomId() {
        return 'room-' + Math.random().toString(36).substr(2, 9);
    }

    generatePlayerPath(startTile, homePath) {
        const COMMON_PATH = [
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
            14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
            27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
            40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52
        ];
        
        const startIndex = COMMON_PATH.indexOf(startTile);
        const normalPath = [
            ...COMMON_PATH.slice(startIndex),
            ...COMMON_PATH.slice(0, startIndex)
        ];
        return [...normalPath, ...homePath];
    }
}

module.exports = GameSocketHandler;
