const { Server } = require("socket.io");

const rooms = {};

/*const Player1 = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57];
const Player2 = [14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,58,1,2,3,4,5,6,7,8,9,10,11,12,59,60,61,62,63,64];
const Player3 = [27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,58,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,65,66,67,68,69,70];
const Player4 = [40,41,42,43,44,45,46,47,48,49,50,51,58,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,71,72,73,74,75,76];

const safeCells = [1,9,14,22,27,35,40,48];*/

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
        
        //const roomId = data.roomId;
        let chosenRoom = null; 

        // ⿡ Check if any room has space
        for (const roomId in rooms) {
            if(rooms[roomId].players.includes(playerData.playerId)){
                chosenRoom = roomId;
            } 
            else{
            if (rooms[roomId].players.length < playerData.maxPlayers) {
                chosenRoom = roomId;
                
                console.log("⿢ Found room with space:", roomId);
                break;           
            }
        }
    }
        
        // ⿢ If no room found → create new room
        if (!chosenRoom) {
            //if(!rooms[roomId].players.includes(playerData.playerId)){
            chosenRoom = generateRoomId();
            rooms[chosenRoom] = {
                roomId: chosenRoom,
                players: {
                    
                path: PLAYER_PATHS[playerData.playerId],
                Token:[{tokenID:"t1", tokenPos:"-1", isSafe:true}],
                },
                createdAt: Date.now()
        };
        socket.join(chosenRoom);
            console.log("⿢ Created new room:", chosenRoom);    
        }

console.log("Client", playerData.playerId);
if (!rooms[chosenRoom].players.includes(playerData.playerId)) {
    
//rooms[chosenRoom].players.push(playerData.playerId);
rooms[chosenRoom].players.push(playerData.playerId);
io.to(chosenRoom).emit("joinRoom", chosenRoom);
    console.log("Rooms state:", rooms);
    startTurnTimer(chosenRoom, playerData.playerId, 10);
        
} else {
    //delete rooms[roomId];
    console.log("⿢ Player already in room:", playerData.playerId);
}
if(rooms[chosenRoom].players.length == playerData.maxPlayers){

        io.to(chosenRoom).emit("gameStart", rooms[chosenRoom]);
        console.log("⿢ Game starting in room:", rooms[chosenRoom]);
    }
    }); 
    socket.on("chatMessage", (data) => {
        console.log("Received chat message from", socket.id, ":", data);
        const messageData = JSON.parse(data);
        io.to(messageData.roomId).emit("chatSent", data);
    });

    socket.on("moveToken", ({ player, token, dice, roomId }) => {

    const move = moveToken(player, token, dice);

    if (!move.moved) {
        return io.to(roomId).emit("moveFailed", move);
    }

    const killed = checkKill(player, move.position);

    io.to(roomId).emit("tokenMoved", {
        player,
        token,
        newPosition: move.position,
        killed
    });
});

    
});

io.on("disconnect", socket => {
    //delete rooms[roomId];

    console.log("Client disconnected", socket.id);

});

function generateRoomId() {
    return "room-" + Math.random().toString(36).substr(2, 5);
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

function generatePlayerPath(startTile, homePath) {
    const startIndex = COMMON_PATH.indexOf(startTile);

    const normalPath = [
        ...COMMON_PATH.slice(startIndex),
        ...COMMON_PATH.slice(0, startIndex)
    ];

    return [...normalPath, ...homePath];
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

