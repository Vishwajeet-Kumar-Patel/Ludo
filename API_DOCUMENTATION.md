# API & WebSocket Documentation

## Base URL
```
Production: https://api.yourgame.com
Development: http://localhost:3000
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## REST API Endpoints

### Authentication

#### POST /api/auth/register
Register a new user account.

**Request:**
```json
{
  "username": "player123",
  "email": "player@example.com",
  "password": "SecurePass123!",
  "displayName": "Player 123"
}
```

**Response:** `201 Created`
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "player123",
    "email": "player@example.com",
    "displayName": "Player 123"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /api/auth/login
Login to existing account.

**Request:**
```json
{
  "username": "player123",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "player123",
    "email": "player@example.com",
    "displayName": "Player 123",
    "coins": 1000,
    "gems": 50,
    "level": 5
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /api/auth/logout
Logout current user (requires authentication).

**Response:** `200 OK`
```json
{
  "message": "Logout successful"
}
```

#### GET /api/auth/profile
Get current user profile (requires authentication).

**Response:** `200 OK`
```json
{
  "profile": {
    "id": 1,
    "username": "player123",
    "displayName": "Player 123",
    "avatarUrl": "https://...",
    "coins": 1000,
    "gems": 50,
    "level": 5,
    "experience": 2500,
    "isOnline": true,
    "gamesPlayed": 100,
    "gamesWon": 65,
    "gamesLost": 35,
    "winStreak": 5,
    "bestWinStreak": 12
  }
}
```

### Clubs

#### POST /api/clubs
Create a new club (requires authentication).

**Request:**
```json
{
  "name": "Pro Players Club",
  "description": "For advanced players only",
  "maxMembers": 50,
  "isPrivate": false
}
```

**Response:** `201 Created`
```json
{
  "club": {
    "id": 1,
    "name": "Pro Players Club",
    "description": "For advanced players only",
    "ownerId": 1,
    "maxMembers": 50,
    "isPrivate": false,
    "createdAt": "2025-12-18T10:00:00.000Z"
  }
}
```

#### GET /api/clubs
Get list of all public clubs.

**Query Parameters:**
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:** `200 OK`
```json
{
  "clubs": [
    {
      "id": 1,
      "name": "Pro Players Club",
      "description": "For advanced players only",
      "ownerUsername": "player123",
      "memberCount": 25,
      "maxMembers": 50,
      "createdAt": "2025-12-18T10:00:00.000Z"
    }
  ]
}
```

#### GET /api/clubs/my-clubs
Get clubs that the current user is a member of (requires authentication).

**Response:** `200 OK`
```json
{
  "clubs": [...]
}
```

#### GET /api/clubs/:clubId
Get details of a specific club.

**Response:** `200 OK`
```json
{
  "club": {
    "id": 1,
    "name": "Pro Players Club",
    "description": "For advanced players only",
    "ownerId": 1,
    "ownerUsername": "player123",
    "memberCount": 25,
    "maxMembers": 50,
    "isPrivate": false,
    "createdAt": "2025-12-18T10:00:00.000Z"
  }
}
```

#### POST /api/clubs/:clubId/join
Join a club (requires authentication).

**Response:** `200 OK`
```json
{
  "message": "Joined club successfully",
  "member": {
    "id": 10,
    "clubId": 1,
    "userId": 5,
    "role": "member",
    "joinedAt": "2025-12-18T12:00:00.000Z"
  }
}
```

#### POST /api/clubs/:clubId/leave
Leave a club (requires authentication).

**Response:** `200 OK`
```json
{
  "message": "Left club successfully"
}
```

#### GET /api/clubs/:clubId/members
Get all members of a club.

**Response:** `200 OK`
```json
{
  "members": [
    {
      "userId": 1,
      "username": "player123",
      "displayName": "Player 123",
      "avatarUrl": "https://...",
      "role": "admin",
      "isOnline": true,
      "joinedAt": "2025-12-18T10:00:00.000Z"
    }
  ]
}
```

### Health Check

#### GET /api/health
Check server health status.

**Response:** `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2025-12-18T12:00:00.000Z",
  "uptime": 3600.5
}
```

---

## WebSocket Events

### Game Namespace (/)

Connect to: `ws://localhost:3000` or `wss://api.yourgame.com`

#### Client → Server Events

##### joinGame
Join or create a game room.

```javascript
socket.emit('joinGame', {
  userId: 'user123',
  playerId: 'Player1',
  playerName: 'John Doe',
  playerImageId: 1,
  maxPlayers: 4,
  gameWinAmount: 1000,
  gameJoinAmount: 100,
  gameMode: 'classic',
  waitingTimerDuration: 30000
});
```

##### reconnect_player
Reconnect to an existing game after disconnect.

```javascript
socket.emit('reconnect_player', {
  userId: 'user123',
  roomId: 'room-abc123def'
});
```

##### rollDice
Roll the dice for current turn.

```javascript
socket.emit('rollDice', {
  roomId: 'room-abc123def',
  userId: 'user123'
});
```

##### moveToken
Move a token after rolling dice.

```javascript
socket.emit('moveToken', {
  roomId: 'room-abc123def',
  userId: 'user123',
  tokenId: 't1',
  diceValue: 6
});
```

##### playerReady
Mark player as ready to start game.

```javascript
socket.emit('playerReady', {
  roomId: 'room-abc123def',
  userId: 'user123'
});
```

##### heartbeat
Send heartbeat to maintain connection.

```javascript
socket.emit('heartbeat');
```

#### Server → Client Events

##### playerJoined
Notifies when a new player joins the room.

```javascript
socket.on('playerJoined', (data) => {
  // data: {
  //   roomId: string,
  //   players: string[],
  //   playerData: object,
  //   newPlayer: {
  //     userId: string,
  //     name: string,
  //     playerKey: string
  //   }
  // }
});
```

##### gameStarted
Notifies when the game starts.

```javascript
socket.on('gameStarted', (data) => {
  // data: {
  //   roomId: string,
  //   players: string[],
  //   playerData: object,
  //   currentPlayer: string
  // }
});
```

##### playerDisconnected
Notifies when a player disconnects.

```javascript
socket.on('playerDisconnected', (data) => {
  // data: {
  //   userId: string,
  //   playerName: string
  // }
});
```

##### playerReconnected
Notifies when a player reconnects.

```javascript
socket.on('playerReconnected', (data) => {
  // data: {
  //   userId: string,
  //   playerName: string
  // }
});
```

##### reconnectSuccess
Confirms successful reconnection with full game state.

```javascript
socket.on('reconnectSuccess', (data) => {
  // data: {
  //   roomId: string,
  //   roomData: object,
  //   yourPlayerData: object
  // }
});
```

##### playerLeft
Notifies when a player permanently leaves.

```javascript
socket.on('playerLeft', (data) => {
  // data: {
  //   userId: string,
  //   remainingPlayers: string[]
  // }
});
```

---

### Club Chat Namespace (/clubs)

Connect to: `ws://localhost:3000/clubs` or `wss://api.yourgame.com/clubs`

#### Client → Server Events

##### join_club
Join a club chat room.

```javascript
socket.emit('join_club', {
  clubId: 1,
  userId: 'user123',
  username: 'John Doe'
});
```

##### club_message
Send a message to the club.

```javascript
socket.emit('club_message', {
  clubId: 1,
  userId: 'user123',
  message: 'Hello everyone!',
  messageType: 'text'  // 'text', 'image', 'emoji'
});
```

##### typing
Send typing indicator.

```javascript
socket.emit('typing', {
  clubId: 1,
  userId: 'user123',
  username: 'John Doe',
  isTyping: true
});
```

##### get_messages
Request message history.

```javascript
socket.emit('get_messages', {
  clubId: 1,
  limit: 50,
  offset: 0
});
```

##### leave_club
Leave a club chat room.

```javascript
socket.emit('leave_club', {
  clubId: 1,
  userId: 'user123',
  username: 'John Doe'
});
```

#### Server → Client Events

##### new_club_message
Receive new chat message.

```javascript
socket.on('new_club_message', (data) => {
  // data: {
  //   id: number,
  //   clubId: number,
  //   userId: string,
  //   message: string,
  //   messageType: string,
  //   timestamp: string
  // }
});
```

##### user_joined_club
Notifies when user joins club.

```javascript
socket.on('user_joined_club', (data) => {
  // data: {
  //   userId: string,
  //   username: string,
  //   timestamp: string
  // }
});
```

##### user_typing
Receive typing indicators.

```javascript
socket.on('user_typing', (data) => {
  // data: {
  //   userId: string,
  //   username: string,
  //   isTyping: boolean,
  //   timestamp: string
  // }
});
```

---

### WebRTC Voice Namespace (/webrtc)

Connect to: `ws://localhost:3000/webrtc` or `wss://api.yourgame.com/webrtc`

#### Client → Server Events

##### join_voice
Join voice chat room.

```javascript
socket.emit('join_voice', {
  roomId: 'room-abc123def',
  userId: 'user123',
  username: 'John Doe'
});
```

##### offer
Send WebRTC offer to peer.

```javascript
socket.emit('offer', {
  targetSocketId: 'socket-xyz789',
  offer: sdpOffer  // RTCSessionDescription
});
```

##### answer
Send WebRTC answer to peer.

```javascript
socket.emit('answer', {
  targetSocketId: 'socket-xyz789',
  answer: sdpAnswer  // RTCSessionDescription
});
```

##### ice_candidate
Send ICE candidate to peer.

```javascript
socket.emit('ice_candidate', {
  targetSocketId: 'socket-xyz789',
  candidate: iceCandidate  // RTCIceCandidate
});
```

##### mute
Notify others that you muted.

```javascript
socket.emit('mute', {});
```

##### unmute
Notify others that you unmuted.

```javascript
socket.emit('unmute', {});
```

#### Server → Client Events

##### existing_participants
Receive list of participants already in voice chat.

```javascript
socket.on('existing_participants', (data) => {
  // data: {
  //   participants: [
  //     {
  //       socketId: string,
  //       userId: string,
  //       username: string
  //     }
  //   ],
  //   iceServers: [
  //     { urls: 'stun:stun.l.google.com:19302' },
  //     { urls: 'turn:...', username: '...', credential: '...' }
  //   ]
  // }
});
```

##### new_participant
Notifies when new user joins voice chat.

```javascript
socket.on('new_participant', (data) => {
  // data: {
  //   socketId: string,
  //   userId: string,
  //   username: string
  // }
});
```

##### offer
Receive WebRTC offer from peer.

```javascript
socket.on('offer', (data) => {
  // data: {
  //   from: string,  // socketId
  //   offer: RTCSessionDescription,
  //   userId: string,
  //   username: string
  // }
});
```

##### answer
Receive WebRTC answer from peer.

```javascript
socket.on('answer', (data) => {
  // data: {
  //   from: string,  // socketId
  //   answer: RTCSessionDescription,
  //   userId: string,
  //   username: string
  // }
});
```

##### ice_candidate
Receive ICE candidate from peer.

```javascript
socket.on('ice_candidate', (data) => {
  // data: {
  //   from: string,  // socketId
  //   candidate: RTCIceCandidate
  // }
});
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation failed)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (resource already exists)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Rate Limiting

- **REST API**: 100 requests per 15 minutes per IP
- **WebSocket**: No hard limit, but excessive spam will be disconnected

---

## Example Client Implementation

### Game Client

```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your_jwt_token'
  }
});

// Join game
socket.emit('joinGame', {
  userId: 'user123',
  playerId: 'Player1',
  playerName: 'John',
  maxPlayers: 4
});

// Listen for game start
socket.on('gameStarted', (data) => {
  console.log('Game started!', data);
});

// Listen for reconnection
socket.on('disconnect', () => {
  console.log('Disconnected, attempting reconnect...');
});

socket.on('connect', () => {
  // Reconnect to game
  socket.emit('reconnect_player', {
    userId: 'user123',
    roomId: savedRoomId
  });
});
```

### Club Chat Client

```javascript
const clubSocket = io('http://localhost:3000/clubs');

clubSocket.emit('join_club', {
  clubId: 1,
  userId: 'user123',
  username: 'John'
});

clubSocket.on('new_club_message', (data) => {
  console.log('New message:', data.message);
});
```

### WebRTC Voice Client

```javascript
const webrtcSocket = io('http://localhost:3000/webrtc');
const peerConnections = {};

webrtcSocket.emit('join_voice', {
  roomId: 'room-123',
  userId: 'user123',
  username: 'John'
});

webrtcSocket.on('existing_participants', async (data) => {
  for (const participant of data.participants) {
    await createPeerConnection(participant.socketId, data.iceServers);
  }
});

async function createPeerConnection(targetSocketId, iceServers) {
  const pc = new RTCPeerConnection({ iceServers });
  peerConnections[targetSocketId] = pc;
  
  // Add local audio stream
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach(track => pc.addTrack(track, stream));
  
  // Create and send offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  webrtcSocket.emit('offer', { targetSocketId, offer });
  
  // Handle ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      webrtcSocket.emit('ice_candidate', {
        targetSocketId,
        candidate: event.candidate
      });
    }
  };
}
```

---

For more information, see the main [README_BACKEND.md](README_BACKEND.md)
