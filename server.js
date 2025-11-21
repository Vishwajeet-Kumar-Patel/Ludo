const { Server } = require("socket.io");

const rooms = {};


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
        
} else {
    //delete rooms[roomId];
    console.log("⿢ Player already in room:", playerData.playerId);
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