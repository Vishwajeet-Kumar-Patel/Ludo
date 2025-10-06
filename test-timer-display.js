const WebSocket = require('ws');

// Test the new timer display functionality
console.log('🧪 Testing Timer Display Functionality...\n');

// Client 1 setup
const client1 = new WebSocket('ws://localhost:3000');
let client1Name = 'Alice';

// Client 2 setup  
const client2 = new WebSocket('ws://localhost:3000');
let client2Name = 'Bob';

client1.on('open', function() {
    console.log('✅ Client 1 (Alice) connected');
    
    // Create a room and join it
    setTimeout(() => {
        client1.send(JSON.stringify({
            type: 'create_room',
            roomName: 'test-timer'
        }));
    }, 100);
    
    setTimeout(() => {
        client1.send(JSON.stringify({
            type: 'join_room',
            roomName: 'test-timer',
            username: client1Name
        }));
    }, 200);
});

client2.on('open', function() {
    console.log('✅ Client 2 (Bob) connected');
    
    // Join the room created by client 1
    setTimeout(() => {
        client2.send(JSON.stringify({
            type: 'join_room',
            roomName: 'test-timer',
            username: client2Name
        }));
    }, 300);
});

client1.on('message', function(data) {
    const message = JSON.parse(data);
    
    if (message.type === 'turn') {
        console.log(`🔴 Client 1 (${client1Name}) received turn message:`);
        console.log(`   Current Player: ${message.playerName}`);
        console.log(`   Is My Turn: ${message.playerName === client1Name}`);
        console.log(`   Display: ${message.playerName === client1Name ? 'TIMER (10 seconds)' : `"${message.playerName}'s turn"`}\n`);
    }
});

client2.on('message', function(data) {
    const message = JSON.parse(data);
    
    if (message.type === 'turn') {
        console.log(`🔵 Client 2 (${client2Name}) received turn message:`);
        console.log(`   Current Player: ${message.playerName}`);
        console.log(`   Is My Turn: ${message.playerName === client2Name}`);
        console.log(`   Display: ${message.playerName === client2Name ? 'TIMER (10 seconds)' : `"${message.playerName}'s turn"`}\n`);
    }
});

// Cleanup after 30 seconds
setTimeout(() => {
    console.log('🧹 Cleaning up test connections...');
    client1.close();
    client2.close();
    process.exit(0);
}, 30000);