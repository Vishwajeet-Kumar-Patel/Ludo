const { Server } = require("socket.io");

const rooms = {};

const Player1 = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57];
const Player2 = [14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,58,1,2,3,4,5,6,7,8,9,10,11,12,59,60,61,62,63,64];
const Player3 = [27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,58,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,65,66,67,68,69,70];
const Player4 = [40,41,42,43,44,45,46,47,48,49,50,51,58,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,71,72,73,74,75,76];

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
                players: [],
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
        io.to(chosenRoom).emit("gameStart", chosenRoom);
    }
    }); 
    socket.on("chatMessage", (data) => {
        console.log("Received chat message from", socket.id, ":", data);
        const messageData = JSON.parse(data);
        io.to(messageData.roomId).emit("chatSent", data);
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

