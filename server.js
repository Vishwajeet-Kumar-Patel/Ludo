/*const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const http = require('http');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Create WebSocket server
const wss = new WebSocket.Server({ server });


// Store connected clients
const clients = new Set();

// Store rooms: { roomName: Set of clients }
const rooms = {};

// Room state: { [roomName]: { players: [ws], playerNames: [string], currentTurn: 0, timer: null } }
const roomState = {};

// WebSocket connection handler
wss.on('connection', (ws, request) => {
    console.log('New client connected from:', request.socket.remoteAddress);
    

    ws.currentRoom = null; // Track which room this client is in
    clients.add(ws);

    // Send welcome message to the new client
    ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to WebSocket server',
        timestamp: new Date().toISOString(),
        clientCount: clients.size
    }));
    
    // Send welcome message to the new client
    ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to WebSocket server',
        timestamp: new Date().toISOString(),
        clientCount: clients.size
    }));
    
    // Broadcast to all clients that someone joined
    broadcast({
        type: 'user_joined',
        message: 'A new user joined the server',
        timestamp: new Date().toISOString(),
        clientCount: clients.size
    }, ws);
    
    // Handle incoming messages
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log('Received message:', message);
            
            // Handle different message types
            switch (message.type) {
                case 'create_room': {
                    const roomName = message.roomName?.trim();
                    if (!roomName) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Room name required', timestamp: new Date().toISOString() }));
                        break;
                    }
                    if (rooms[roomName]) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Room already exists', timestamp: new Date().toISOString() }));
                        break;
                    }
                    rooms[roomName] = new Set();
                    ws.send(JSON.stringify({ type: 'room_created', roomName, timestamp: new Date().toISOString() }));
                    break;
                }
                case 'join_room': {
                    const roomName = message.roomName?.trim();
                    const username = message.username || 'Anonymous';
                    if (!roomName || !rooms[roomName]) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Room does not exist', timestamp: new Date().toISOString() }));
                        break;
                    }
                    ws.username = username;
                    // Remove from previous room
                    if (ws.currentRoom && rooms[ws.currentRoom]) {
                        rooms[ws.currentRoom].delete(ws);
                        if (roomState[ws.currentRoom]) {
                            roomState[ws.currentRoom].players = Array.from(rooms[ws.currentRoom]);
                            roomState[ws.currentRoom].playerNames = roomState[ws.currentRoom].players.map(w => w.username || 'Anonymous');
                        }
                    }
                    rooms[roomName].add(ws);
                    ws.currentRoom = roomName;
                    ws.send(JSON.stringify({ type: 'room_joined', roomName, timestamp: new Date().toISOString() }));
                    // Initialize room state if not present
                    if (!roomState[roomName]) {
                        roomState[roomName] = { players: [], playerNames: [], currentTurn: 0, timer: null };
                    }
                    // Update player list and names
                    roomState[roomName].players = Array.from(rooms[roomName]);
                    roomState[roomName].playerNames = roomState[roomName].players.map(w => w.username || 'Anonymous');
                    // Always (re)start the turn timer and notify the room
                    startMoveTimer(roomName);
                    break;
                }
                case 'list_rooms': {
                    ws.send(JSON.stringify({
                        type: 'room_list',
                        rooms: Object.keys(rooms),
                        timestamp: new Date().toISOString()
                    }));
                    break;
                }
                case 'chat': {
                    // If in a room, broadcast to that room only
                    if (ws.currentRoom && rooms[ws.currentRoom]) {
                        broadcastToRoom(ws.currentRoom, {
                            type: 'chat',
                            message: message.message,
                            sender: message.sender || 'Anonymous',
                            timestamp: new Date().toISOString()
                        });
                    } else {
                        // Otherwise, broadcast to all
                        broadcast({
                            type: 'chat',
                            message: message.message,
                            sender: message.sender || 'Anonymous',
                            timestamp: new Date().toISOString()
                        });
                    }
                    break;
                }
                case 'game_move': {
                    // If in a room, broadcast to that room only
                    if (ws.currentRoom && rooms[ws.currentRoom]) {
                        const state = roomState[ws.currentRoom];
                        if (state) {
                            // Only allow move if it's this player's turn
                            const currentPlayer = state.players[state.currentTurn];
                            if (currentPlayer === ws) {
                                broadcastToRoom(ws.currentRoom, {
                                    type: 'game_move',
                                    move: message.move,
                                    player: message.player,
                                    value: message.value,
                                    piece: message.piece,
                                    timestamp: new Date().toISOString()
                                });
                                // Advance turn and reset timer
                                advanceTurn(ws.currentRoom);
                            } else {
                                ws.send(JSON.stringify({ type: 'error', message: 'Not your turn!', timestamp: new Date().toISOString() }));
                            }
                        }
                    } else {
                        broadcast({
                            type: 'game_move',
                            move: message.move,
                            player: message.player,
                            value: message.value,
                            piece: message.piece,
                            timestamp: new Date().toISOString()
                        });
                    }
                    break;
                }
                case 'ping':
                    ws.send(JSON.stringify({
                        type: 'pong',
                        timestamp: new Date().toISOString()
                    }));
                    break;
                default:
                    ws.send(JSON.stringify({
                        type: 'echo',
                        originalMessage: message,
                        timestamp: new Date().toISOString()
                    }));
            }
        } catch (error) {
            console.error('Error parsing message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid JSON format',
                timestamp: new Date().toISOString()
            }));
        }
    });
    
    // Handle client disconnect
    ws.on('close', (code, reason) => {
        console.log('Client disconnected:', code, reason.toString());
        clients.delete(ws);
        // Remove from room and update state
        if (ws.currentRoom && rooms[ws.currentRoom]) {
            rooms[ws.currentRoom].delete(ws);
            if (roomState[ws.currentRoom]) {
                roomState[ws.currentRoom].players = Array.from(rooms[ws.currentRoom]);
                // If the player who left was the current turn, advance turn
                if (roomState[ws.currentRoom].players.length > 0) {
                    if (roomState[ws.currentRoom].currentTurn >= roomState[ws.currentRoom].players.length) {
                        roomState[ws.currentRoom].currentTurn = 0;
                    }
                    startMoveTimer(ws.currentRoom);
                } else {
                    // No players left, clear timer
                    clearTimeout(roomState[ws.currentRoom].timer);
                    delete roomState[ws.currentRoom];
                }
            }
        }
        // Notify remaining clients
        broadcast({
            type: 'user_left',
            message: 'A user left the server',
            timestamp: new Date().toISOString(),
            clientCount: clients.size
        });
    });
    
    // Handle connection errors
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clients.delete(ws);
    });
});

// Start or restart the move timer for a room
function startMoveTimer(roomName) {
    const state = roomState[roomName];
    if (!state || state.players.length === 0) return;
    clearTimeout(state.timer);
    const currentPlayer = state.players[state.currentTurn];
    console.log(`[TIMER] Starting turn timer for room '${roomName}'. Current player:`, state.playerNames[state.currentTurn]);
    // Notify room whose turn it is, with player names
    broadcastToRoom(roomName, {
        type: 'turn',
        playerIndex: state.currentTurn,
        playerName: state.playerNames[state.currentTurn],
        playerNames: state.playerNames,
        message: `It's your turn!`,
        timestamp: new Date().toISOString()
    });
    state.timer = setTimeout(() => {
        console.log(`[TIMER] Turn timed out for room '${roomName}'. Player:`, state.playerNames[state.currentTurn]);
        // Timer expired, skip turn
        broadcastToRoom(roomName, {
            type: 'turn_timeout',
            playerIndex: state.currentTurn,
            playerName: state.playerNames[state.currentTurn],
            playerNames: state.playerNames,
            message: 'Turn timed out! Skipping to next player.',
            timestamp: new Date().toISOString()
        });
        advanceTurn(roomName);
    }, 10000); // 10 seconds
}

// Advance to the next player's turn in a room
function advanceTurn(roomName) {
    const state = roomState[roomName];
    if (!state || state.players.length === 0) return;
    state.currentTurn = (state.currentTurn + 1) % state.players.length;
    console.log(`[TIMER] Advancing turn in room '${roomName}'. Next player:`, state.playerNames[state.currentTurn]);
    startMoveTimer(roomName);
}

// Function to broadcast message to all connected clients

// Function to broadcast message to all connected clients
function broadcast(message, excludeClient = null) {
    const messageString = JSON.stringify(message);
    clients.forEach(client => {
        if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
            client.send(messageString);
        }
    });
}

// Function to broadcast message to all clients in a room
function broadcastToRoom(roomName, message, excludeClient = null) {
    const messageString = JSON.stringify(message);
    if (!rooms[roomName]) return;
    rooms[roomName].forEach(client => {
        if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
            client.send(messageString);
        }
    });
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        connectedClients: clients.size,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 WebSocket server is running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});*/




const { Server } = require("socket.io");

const io = new Server(3000, {
    cors: { origin: "*" }
});

io.on("connection", socket => {
    console.log("Client connected", socket.id);

    socket.emit("joined", { id: socket.id });

    socket.on("rollDice", () => {
        const dice = Math.floor(Math.random() * 6) + 1;
        io.emit("diceRolled", JSON.stringify({ playerId: socket.id, diceValue: dice }));
        console.log("Dice rolled by", socket.id);
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected", socket.id);
    });
});

io.on("disconnect", socket => {
    console.log("Client disconnected", socket.id);

});