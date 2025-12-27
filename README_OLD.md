# WebSocket Setup for Node.js - Ludo Game

This project demonstrates a complete WebSocket implementation using Node.js for real-time communication, perfect for multiplayer games like Ludo.

## 🚀 Features

- **Real-time Communication**: Bidirectional communication between server and clients
- **Message Broadcasting**: Send messages to all connected clients
- **Connection Management**: Handle client connections and disconnections
- **Game-specific Messages**: Support for game moves, dice rolls, and piece movements
- **Health Monitoring**: Built-in health check endpoint
- **Error Handling**: Comprehensive error handling and validation
- **Web Interface**: Ready-to-use HTML client for testing

## 📁 Project Structure

```
Ludo/
├── server.js          # Main WebSocket server
├── package.json       # Project dependencies
├── public/
│   └── index.html     # Client-side web interface
└── README.md          # This file
```

## 🛠️ Installation & Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Server**:
   ```bash
   npm start
   # or for development with auto-restart
   npm run dev
   ```

3. **Access the Client**:
   Open your browser to `http://localhost:3000`

## 🔧 WebSocket Server Features

### Connection Handling
- Automatic client tracking
- Welcome messages for new connections
- Broadcast notifications when users join/leave
- Graceful disconnect handling

### Message Types Supported
- `chat`: Chat messages between users
- `game_move`: Game-specific moves (dice rolls, piece movements)
- `ping/pong`: Connection health checks
- `welcome`: Server welcome messages
- `user_joined/user_left`: Connection status updates

### API Endpoints
- `GET /health`: Health check with connection stats
- `GET /`: Serves the client interface

## 💻 Client Interface Features

- **Connection Management**: Connect/disconnect buttons
- **Real-time Chat**: Send and receive chat messages
- **Game Controls**: Dice rolling and piece movement simulation
- **Connection Status**: Visual connection status indicator
- **Message History**: Scrollable message log with timestamps
- **User Management**: Set username for identification

## 🎮 Usage Examples

### Basic Chat Message
```javascript
// Client sends
{
  "type": "chat",
  "message": "Hello everyone!",
  "sender": "Player1"
}

// Server broadcasts to all clients
{
  "type": "chat",
  "message": "Hello everyone!",
  "sender": "Player1",
  "timestamp": "2025-09-21T10:30:00.000Z"
}
```

### Game Move (Dice Roll)
```javascript
// Client sends
{
  "type": "game_move",
  "move": "dice_roll",
  "player": "Player1",
  "value": 6
}

// Server broadcasts
{
  "type": "game_move",
  "move": "dice_roll",
  "player": "Player1",
  "value": 6,
  "timestamp": "2025-09-21T10:30:00.000Z"
}
```

### Piece Movement
```javascript
// Client sends
{
  "type": "game_move",
  "move": "piece_move",
  "player": "Player1",
  "piece": 2
}
```

## 🔍 Testing the WebSocket Connection

1. **Start the server**: `npm start`
2. **Open multiple browser tabs** to `http://localhost:3000`
3. **Test different features**:
   - Send chat messages between tabs
   - Try dice rolls and piece movements
   - Use the ping function to test connection
   - Close tabs to see disconnect notifications

## 📡 WebSocket Connection Details

- **Server URL**: `ws://localhost:3000`
- **Protocol**: WebSocket (RFC 6455)
- **Message Format**: JSON
- **Port**: 3000 (configurable via PORT environment variable)

## 🛡️ Error Handling

The server handles various error scenarios:
- Invalid JSON messages
- Connection errors
- Client disconnections
- Message parsing errors
- Unknown message types (echoed back)

## 🔧 Configuration

### Environment Variables
- `PORT`: Server port (default: 3000)

### Customization
- Modify message types in `server.js`
- Update client interface in `public/index.html`
- Add new game-specific logic as needed

## 📈 Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "connectedClients": 2,
  "uptime": 3600.123,
  "timestamp": "2025-09-21T10:30:00.000Z"
}
```

## 🚀 Next Steps for Ludo Game

1. **Game State Management**: Add game board state tracking
2. **Player Management**: Implement player registration and authentication
3. **Game Rules**: Add Ludo-specific game logic validation
4. **Persistence**: Store game state in a database
5. **Rooms**: Support multiple game rooms/sessions
6. **Spectators**: Allow users to watch games
7. **Reconnection**: Handle player reconnections gracefully

## 🔧 Development

### Adding New Message Types

1. Update server message handling in `server.js`:
```javascript
case 'your_message_type':
    // Handle your message
    broadcast({
        type: 'your_response_type',
        data: processYourMessage(message),
        timestamp: new Date().toISOString()
    });
    break;
```

2. Update client handling in `public/index.html`:
```javascript
case 'your_response_type':
    // Handle server response
    handleYourResponse(data);
    break;
```

## 🐛 Troubleshooting

### Common Issues
1. **Connection Refused**: Ensure server is running on correct port
2. **CORS Issues**: Server serves static files, so access via `http://localhost:3000`
3. **Message Not Received**: Check JSON format and message type handling
4. **Multiple Connections**: Each browser tab creates a separate connection

### Debug Mode
Enable console logging by checking browser developer tools and server console output.

## 📝 License

MIT License - Feel free to use this code for your projects!