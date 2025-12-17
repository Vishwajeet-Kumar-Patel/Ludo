# Quick Start Guide

## Prerequisites

- Node.js v20+ installed
- PostgreSQL 14+ installed and running
- Redis 7+ installed and running
- Git installed

## Step 1: Clone and Install

```bash
git clone https://github.com/Vishwajeet-Kumar-Patel/Ludo.git
cd Ludo-1
npm install
```

## Step 2: Database Setup

### PostgreSQL

```bash
# Create database
createdb ludo_game

# Or using psql
psql -U postgres
CREATE DATABASE ludo_game;
\q
```

### Redis

```bash
# Start Redis server
redis-server

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

## Step 3: Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
# Important variables to set:
# - DB_PASSWORD=your_postgres_password
# - JWT_SECRET=generate-a-secure-random-string
```

## Step 4: Run the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

You should see:
```
✅ PostgreSQL connected successfully
✅ Redis connected successfully
✅ All services initialized successfully
🎮 Ludo Game Server running on 0.0.0.0:3000
```

## Step 5: Test the API

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testplayer",
    "email": "test@example.com",
    "password": "Test123!",
    "displayName": "Test Player"
  }'

# You'll receive a JWT token in the response
```

## Step 6: Test WebSocket Connection

Create a simple HTML file (`test-client.html`):

```html
<!DOCTYPE html>
<html>
<head>
    <title>Ludo Test Client</title>
    <script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>
</head>
<body>
    <h1>Ludo Game Test Client</h1>
    <button onclick="joinGame()">Join Game</button>
    <div id="status"></div>

    <script>
        const socket = io('http://localhost:3000');
        
        socket.on('connect', () => {
            document.getElementById('status').innerHTML = 'Connected!';
        });
        
        socket.on('playerJoined', (data) => {
            console.log('Player joined:', data);
        });
        
        socket.on('gameStarted', (data) => {
            console.log('Game started:', data);
        });
        
        function joinGame() {
            socket.emit('joinGame', {
                userId: 'test123',
                playerId: 'Player1',
                playerName: 'Test Player',
                playerImageId: 1,
                maxPlayers: 4,
                gameMode: 'classic'
            });
        }
    </script>
</body>
</html>
```

Open this file in your browser and click "Join Game".

## Troubleshooting

### PostgreSQL Connection Issues

```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL (Ubuntu/Debian)
sudo service postgresql start

# Start PostgreSQL (macOS)
brew services start postgresql
```

### Redis Connection Issues

```bash
# Check if Redis is running
ps aux | grep redis

# Start Redis
redis-server

# Check Redis can connect
redis-cli ping
```

### Port Already in Use

```bash
# Find process using port 3000
# Windows:
netstat -ano | findstr :3000

# macOS/Linux:
lsof -i :3000

# Kill the process and restart
```

## Next Steps

1. **Read the Documentation**:
   - [README_BACKEND.md](README_BACKEND.md) - Full system documentation
   - [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - Complete API reference

2. **Set Up Frontend**:
   - Connect your Unity/C# frontend to the backend
   - Use Socket.IO client library for Unity
   - Implement WebSocket event handlers

3. **Deploy to Production**:
   - Follow the AWS deployment guide in README_BACKEND.md
   - Set up CI/CD pipeline
   - Configure domain and SSL

4. **Add Features**:
   - Implement actual game logic (dice rolling, token movement)
   - Add payment integration
   - Add leaderboards
   - Add notifications

## Project Structure

```
Ludo-1/
├── src/
│   ├── config/          # Configuration files
│   ├── models/          # Database models
│   ├── controllers/     # Route controllers
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── sockets/         # WebSocket handlers
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   └── server.js        # Main server file
├── scripts/             # Deployment scripts
├── logs/                # Application logs
├── public/              # Static files
├── .env                 # Environment variables (create this)
├── .env.example         # Environment template
├── package.json         # Dependencies
└── README_BACKEND.md    # Documentation
```

## Support

For issues or questions:
1. Check the documentation
2. Review API_DOCUMENTATION.md for endpoint details
3. Check logs in `logs/` directory
4. Open an issue on GitHub

## Security Notes

⚠️ **Before deploying to production:**
- Change JWT_SECRET to a strong random string
- Use strong database passwords
- Enable SSL/TLS
- Configure CORS properly
- Set up rate limiting
- Use environment variables for all secrets
- Never commit .env file to Git

---

Happy Coding! 🎮
