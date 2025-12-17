const { Server } = require("socket.io");
const redis = require('./redisClient');

const rooms = {};

// Traditional 52-tile clockwise path
const COMMON_PATH = [
     1,  2,  3,  4,  5,  6,  7,  8, 
     9, 10, 11, 12, 13, 
    14, 15, 16, 17, 18, 19, 20, 21, 
    22, 23, 24, 25, 26, 
    27, 28, 29, 30, 31, 32, 33, 34, 
    35, 36, 37, 38, 39,
    40, 41, 42, 43, 44, 45, 46, 47, 
    48, 49, 50, 51, 52
];

// Safe cells
const SAFE_CELLS = [1, 9, 14, 22, 27, 35, 40, 48];

const HOME_PATHS = {
    Player1: [53, 54, 55, 56, 57],
    Player2: [58, 59, 60, 61, 62],
    Player3: [63, 64, 65, 66, 67],
    Player4: [68, 69, 70, 71, 72]
};

function generatePlayerPath(startTile, homePath) {
    const startIndex = COMMON_PATH.indexOf(startTile);
    const normalPath = [
        ...COMMON_PATH.slice(startIndex),
        ...COMMON_PATH.slice(0, startIndex)
    ];
    return [...normalPath, ...homePath];
}

const PLAYER_PATHS = {
    Player1: generatePlayerPath(1,  HOME_PATHS.Player1),
    Player2: generatePlayerPath(14, HOME_PATHS.Player2),
    Player3: generatePlayerPath(27, HOME_PATHS.Player3),
    Player4: generatePlayerPath(40, HOME_PATHS.Player4)
};

const tokenPositions = {
    Player1: [ -1, -1, -1, -1 ],
    Player2: [ -1, -1, -1, -1 ],
    Player3: [ -1, -1, -1, -1 ],
    Player4: [ -1, -1, -1, -1 ]
};

const io = new Server(3000, {
    cors: { origin: "*" }
});

io.on("connection", socket => {
    console.log("New client connected", socket.id);

    socket.on("joinGame", (data) => {
        console.log("Client joined game", socket.id, data);
        const playerData = JSON.parse(data);
        
        let chosenRoom = null; 

        // Check if any room has space
        for (const roomId in rooms) {
            if(rooms[roomId].players.includes(playerData.playerId)){
                chosenRoom = roomId;
                break;
            } 
            else if (rooms[roomId].players.length < rooms[roomId].maxPlayers) {
                chosenRoom = roomId;
                console.log("⿢ Found room with space:", roomId);
                break;           
            }
        }
        
        // If no room found → create new room
        if (!chosenRoom) {
            chosenRoom = generateRoomId();
            rooms[chosenRoom] = {
                roomId: chosenRoom,
                players: [],
                playerData: {},
                maxPlayers: playerData.maxPlayers || 4,
                gameWinAmount: playerData.gameWinAmount,
                gameJoinAmount: playerData.gameJoinAmount,
                waitingTimerDuration: playerData.waitingTimerDuration || 30,
                gameMode: playerData.gameMode,
                createdAt: Date.now()
            };
            socket.join(chosenRoom);
            
            // Cache room in Redis
            redis.set(`room:${chosenRoom}`, JSON.stringify(rooms[chosenRoom]));
            
            console.log("⿢ Created new room:", chosenRoom);    
        }

        console.log("Client", playerData.playerId);
        
        // Add player to room
        if (!rooms[chosenRoom].players.includes(playerData.playerId)) {
            // Determine player position (0-3) in the room
            const playerIndex = rooms[chosenRoom].players.length;
            const playerKeys = ['Player1', 'Player2', 'Player3', 'Player4'];
            const playerKey = playerKeys[playerIndex];
            
            // Generate path based on player position
            const startTiles = [1, 14, 27, 40];
            const homePaths = [
                [53, 54, 55, 56, 57],
                [58, 59, 60, 61, 62],
                [63, 64, 65, 66, 67],
                [68, 69, 70, 71, 72]
            ];
            const playerPath = generatePlayerPath(startTiles[playerIndex], homePaths[playerIndex]);
            
            rooms[chosenRoom].players.push(playerData.playerId);
            rooms[chosenRoom].playerData[playerData.playerId] = {
                socketId: socket.id,
                name: playerData.playerName,
                imageId: playerData.playerImageId,
                playerKey: playerKey,
                playerIndex: playerIndex,
                path: playerPath,
                tokens: [
                    {tokenID: "t1", tokenPos: "-1", isSafe: true},
                    {tokenID: "t2", tokenPos: "-1", isSafe: true},
                    {tokenID: "t3", tokenPos: "-1", isSafe: true},
                    {tokenID: "t4", tokenPos: "-1", isSafe: true}
                ],
                score: 0
                
            };
            
            //console.log("=== Player Path Info ===");
            //console.log("Player ID:", playerData.playerId);
            //console.log("Player Key:", playerKey);
            //console.log("Player Index:", playerIndex);
            //console.log("Path Array Length:", playerPath.length);
            
            // Cache player data in Redis
            redis.hSet(`room:${chosenRoom}:players`, playerData.playerId, JSON.stringify(rooms[chosenRoom].playerData[playerData.playerId]));
            redis.set(`room:${chosenRoom}`, JSON.stringify(rooms[chosenRoom]));
            
            io.to(chosenRoom).emit("joinRoom", {
                roomId: chosenRoom,
                players: rooms[chosenRoom].players,
                playerData: rooms[chosenRoom].playerData
            });
            console.log("Rooms state:", JSON.stringify(rooms, null, 2));
            startTurnTimer(chosenRoom, playerData.playerId, 10);
        } else {
            console.log("⿢ Player already in room:", playerData.playerId);
        }
        
        // Check if room is full and start game
        if(rooms[chosenRoom].players.length == rooms[chosenRoom].maxPlayers){
            io.to(chosenRoom).emit("gameStart", rooms[chosenRoom]);
            console.log("⿢ Game starting in room:", rooms[chosenRoom]);
        }
    });

    socket.on("chatMessage", (data) => {
        console.log("Received chat message from", socket.id, ":", data);
        const messageData = JSON.parse(data);
        io.to(messageData.roomId).emit("chatSent", data);
    });

    socket.on("moveToken", async ({ player, token, dice, roomId }) => {
        const move = moveToken(player, token, dice);

        if (!move.moved) {
            return io.to(roomId).emit("moveFailed", move);
        }

        const killed = checkKill(player, move.position);

        // Update token positions in Redis
        await redis.set(`room:${roomId}:tokens`, JSON.stringify(tokenPositions));
        
        io.to(roomId).emit("tokenMoved", {
            player,
            token,
            newPosition: move.position,
            killed
        });
    });

    socket.on("disconnect", async () => {
        console.log("Client disconnected", socket.id);
        
        // Find and remove player from rooms
        for (const roomId in rooms) {
            const room = rooms[roomId];
            for (const playerId in room.playerData) {
                if (room.playerData[playerId].socketId === socket.id) {
                    console.log(`Player ${playerId} left room ${roomId}`);
                    
                    // Remove player from room
                    room.players = room.players.filter(id => id !== playerId);
                    delete room.playerData[playerId];
                    
                    // Update Redis
                    await redis.set(`room:${roomId}`, JSON.stringify(room));
                    await redis.del(`room:${roomId}:players:${playerId}`);
                    
                    // Notify other players
                    io.to(roomId).emit("playerLeft", {
                        playerId,
                        remainingPlayers: room.players
                    });
                    
                    // Delete room if empty
                    if (room.players.length === 0) {
                        delete rooms[roomId];
                        await redis.del(`room:${roomId}`);
                        await redis.del(`room:${roomId}:players`);
                        await redis.del(`room:${roomId}:tokens`);
                        console.log(`Room ${roomId} deleted (empty)`);
                    }
                    break;
                }
            }
        }
    });
});

function generateRoomId() {
    return "room-" + Math.random().toString(36).substr(2, 5);
}

function startTurnTimer(roomId, playerId, duration) {
    let timeLeft = duration;
    const timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
        }
        console.log(`⿢ Turn timer started for player ${playerId} in room ${roomId} for ${timeLeft} seconds.`);
    }, 1000);
    
    return timerInterval;
}

function stopTurnTimer(timerInterval) {
    clearInterval(timerInterval);
}

function moveToken(player, tokenIndex, dice) {
    let pos = tokenPositions[player][tokenIndex];
    const path = PLAYER_PATHS[player];

    // Token in HOME
    if (pos === -1) {
        if (dice !== 6)
            return { moved: false, reason: "Need 6 to leave home" };

        tokenPositions[player][tokenIndex] = 0; // enter board
        return { moved: true, position: path[0] };
    }

    // Normal movement
    const newPos = pos + dice;
    
    if (newPos >= path.length) {
        return { moved: false, reason: "Overshoot" };
    }

    tokenPositions[player][tokenIndex] = newPos;

    return { moved: true, position: path[newPos] };
}

function checkKill(player, tile) {
    if (SAFE_CELLS.includes(tile)) return null;

    let killed = [];

    for (let opponent in tokenPositions) {
        if (opponent === player) continue;

        const opponentPath = PLAYER_PATHS[opponent];

        for (let t = 0; t < 4; t++) {
            let pos = tokenPositions[opponent][t];
            if (pos < 0) continue;

            let opponentTile = opponentPath[pos];

            if (opponentTile === tile) {
                // Kill
                tokenPositions[opponent][t] = -1;

                killed.push({
                    player: opponent,
                    token: t
                });
            }
        }
    }

    return killed;
}

// Helper function to load rooms from Redis on server restart
async function loadRoomsFromRedis() {
    if (!redis.isConnected()) {
        console.log("⚠️  Redis not connected, starting with empty rooms");
        return;
    }
    
    try {
        console.log("📥 Loading rooms from Redis...");
        // This would require scanning all room keys
        // For now, we'll just log that Redis is available
        console.log("✅ Redis connected - room data will be cached");
    } catch (error) {
        console.log("⚠️  Failed to load from Redis:", error.message);
    }
}

// Load existing rooms from Redis on startup
loadRoomsFromRedis();

console.log("🎲 Ludo Server running on port 3000");
