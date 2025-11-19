module.exports = {
    playerJoined: (io, roomId, data) => {
        io.to(roomId).emit("Player Joined")
    }
}