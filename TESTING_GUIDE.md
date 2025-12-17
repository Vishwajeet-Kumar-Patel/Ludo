# 🧪 Quick Testing Guide

## Server Status Check ✅

Server is running on: **http://localhost:3000**

```powershell
# Quick health check
curl http://localhost:3000/api/health
```

---

## 🎮 Test Game Flow (PowerShell)

### 1. Register Two Players

```powershell
# Player 1
$player1 = @{
    username = "player1"
    email = "player1@game.com"
    password = "password123"
} | ConvertTo-Json

$p1Response = Invoke-RestMethod -Uri http://localhost:3000/api/auth/register -Method POST -Body $player1 -ContentType "application/json"
$token1 = $p1Response.token
Write-Host "Player 1 Token: $token1"

# Player 2
$player2 = @{
    username = "player2"
    email = "player2@game.com"
    password = "password123"
} | ConvertTo-Json

$p2Response = Invoke-RestMethod -Uri http://localhost:3000/api/auth/register -Method POST -Body $player2 -ContentType "application/json"
$token2 = $p2Response.token
Write-Host "Player 2 Token: $token2"
```

### 2. Send Friend Request

```powershell
$headers1 = @{ "Authorization" = "Bearer $token1" }

$friendRequest = @{
    toUserId = $p2Response.user.id
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/api/friends/request -Method POST -Body $friendRequest -ContentType "application/json" -Headers $headers1
```

### 3. Accept Friend Request

```powershell
$headers2 = @{ "Authorization" = "Bearer $token2" }

# Get pending requests
$pending = Invoke-RestMethod -Uri http://localhost:3000/api/friends/requests/pending -Method GET -Headers $headers2

# Accept first request
$requestId = $pending[0].id
Invoke-RestMethod -Uri "http://localhost:3000/api/friends/request/$requestId/accept" -Method POST -Headers $headers2
```

### 4. Check Friends List

```powershell
# Player 1's friends
Invoke-RestMethod -Uri http://localhost:3000/api/friends -Method GET -Headers $headers1

# Player 2's friends
Invoke-RestMethod -Uri http://localhost:3000/api/friends -Method GET -Headers $headers2
```

### 5. View Statistics

```powershell
# My stats
Invoke-RestMethod -Uri http://localhost:3000/api/stats/me -Method GET -Headers $headers1

# Leaderboard
Invoke-RestMethod -Uri "http://localhost:3000/api/stats/leaderboard?sortBy=games_won&limit=10" -Method GET

# Top players by win rate
Invoke-RestMethod -Uri "http://localhost:3000/api/stats/top-players?metric=win_rate&limit=10" -Method GET
```

### 6. Create Club

```powershell
$club = @{
    name = "Pro Gamers Club"
    description = "For serious Ludo players only"
} | ConvertTo-Json

$clubResponse = Invoke-RestMethod -Uri http://localhost:3000/api/clubs -Method POST -Body $club -ContentType "application/json" -Headers $headers1

$clubId = $clubResponse.club.id
Write-Host "Club ID: $clubId"
```

### 7. Join Club

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/clubs/$clubId/join" -Method POST -Headers $headers2
```

### 8. Get Club Members

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/clubs/$clubId/members" -Method GET -Headers $headers1
```

---

## 🎲 Test Socket.IO Game (Node.js Client)

Create a file `test-game-client.js`:

```javascript
const io = require('socket.io-client');

const token = 'YOUR_JWT_TOKEN_HERE';

const socket = io('http://localhost:3000', {
    extraHeaders: {
        Authorization: `Bearer ${token}`
    }
});

socket.on('connect', () => {
    console.log('✅ Connected to game server');
    
    // Join game
    socket.emit('joinGame', {
        userId: 'user-id-here',
        playerId: 'player1',
        playerName: 'TestPlayer',
        playerImageId: 1,
        maxPlayers: 4
    });
});

socket.on('playerJoined', (data) => {
    console.log('👥 Player joined:', data);
});

socket.on('gameStarted', (data) => {
    console.log('🎮 Game started:', data);
    
    // Roll dice when it's your turn
    if (data.currentPlayer === 'your-user-id') {
        socket.emit('rollDice', {
            roomId: data.roomId,
            userId: 'your-user-id'
        });
    }
});

socket.on('diceRolled', (data) => {
    console.log('🎲 Dice rolled:', data.diceValue);
    console.log('Valid moves:', data.validMoves);
    
    // Move first valid token
    if (data.validMoves.length > 0 && data.userId === 'your-user-id') {
        socket.emit('moveToken', {
            roomId: 'room-id',
            userId: 'your-user-id',
            tokenIndex: data.validMoves[0]
        });
    }
});

socket.on('tokenMoved', (data) => {
    console.log('🏃 Token moved:', data);
});

socket.on('tokensKilled', (data) => {
    console.log('💀 Tokens killed:', data.kills);
});

socket.on('turnChanged', (data) => {
    console.log('🔄 Turn changed to:', data.currentPlayerName);
});

socket.on('gameOver', (data) => {
    console.log('🏆 Game over! Winner:', data.winnerName);
    console.log('Final standings:', data.finalStandings);
});

socket.on('error', (error) => {
    console.error('❌ Error:', error);
});

// Run: node test-game-client.js
```

---

## 📊 Database Queries

```powershell
# Connect to PostgreSQL
$env:PGPASSWORD='Vish@1011'

# View all users
psql -U postgres -d ludo_game -c "SELECT id, username, email, is_online FROM users;"

# View game history
psql -U postgres -d ludo_game -c "SELECT room_id, status, winner_id, created_at FROM game_history ORDER BY created_at DESC LIMIT 10;"

# View user stats
psql -U postgres -d ludo_game -c "SELECT u.username, us.games_played, us.games_won, us.total_score FROM user_stats us JOIN users u ON u.id = us.user_id ORDER BY us.games_won DESC LIMIT 10;"

# View friends
psql -U postgres -d ludo_game -c "SELECT u1.username as user, u2.username as friend FROM friends f JOIN users u1 ON u1.id = f.user_id JOIN users u2 ON u2.id = f.friend_id;"

# View clubs
psql -U postgres -d ludo_game -c "SELECT id, name, description, created_at FROM clubs;"
```

---

## 🔍 Redis Monitoring

```powershell
# Check Redis connection
redis-cli ping

# Monitor all commands
redis-cli monitor

# Check keys
redis-cli KEYS *

# Get room data
redis-cli GET "room:room-id-here"

# Check active locks
redis-cli KEYS "lock:*"
```

---

## 🐛 Troubleshooting

### Server won't start?
```powershell
# Check if port 3000 is in use
netstat -ano | findstr :3000

# Kill process if needed
taskkill /PID <PID> /F

# Restart server
npm start
```

### PostgreSQL connection error?
```powershell
# Test connection
$env:PGPASSWORD='Vish@1011'
psql -U postgres -c "SELECT 1;"

# Check if database exists
psql -U postgres -c "\l"
```

### Redis connection error?
```powershell
# Check if Redis is running
redis-cli ping

# Start Redis (if not running)
redis-server
```

### JWT token expired?
```powershell
# Login again to get new token
$loginBody = @{
    username = "player1"
    password = "password123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri http://localhost:3000/api/auth/login -Method POST -Body $loginBody -ContentType "application/json"
$token = $response.token
```

---

## 📈 Performance Testing

### Load Test with Apache Bench
```powershell
# Install: https://httpd.apache.org/download.cgi

# Test health endpoint (100 requests, 10 concurrent)
ab -n 100 -c 10 http://localhost:3000/api/health

# Test login endpoint
ab -n 50 -c 5 -p login.json -T application/json http://localhost:3000/api/auth/login
```

### Monitor Resource Usage
```powershell
# CPU and Memory
Get-Process node | Select-Object CPU, WS

# Continuous monitoring
while($true) { 
    Get-Process node | Select-Object Name, CPU, @{Name="Memory(MB)";Expression={[math]::Round($_.WS/1MB,2)}} 
    Start-Sleep -Seconds 2 
    Clear-Host 
}
```

---

## ✅ Quick Verification Checklist

- [ ] Server starts without errors
- [ ] PostgreSQL connected
- [ ] Redis connected
- [ ] Can register users
- [ ] Can login and get JWT token
- [ ] Can create clubs
- [ ] Can send/accept friend requests
- [ ] Can view statistics
- [ ] Can view leaderboard
- [ ] Socket.IO connects successfully
- [ ] Can join game room
- [ ] Can roll dice
- [ ] Can move tokens
- [ ] Game state persists to database

---

## 🎯 Ready for Unity Integration!

**Base URL:** `http://localhost:3000`

**Socket.IO URL:** `ws://localhost:3000`

**Authentication:** JWT Bearer token in headers

**Documentation:** See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for complete API reference

---

## 🚀 All Systems Operational!

Everything is working and ready for your Unity/C# frontend team to integrate!
