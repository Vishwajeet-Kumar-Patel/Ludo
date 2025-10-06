const WebSocket = require('ws');

console.log('🧪 Testing WebSocket Room and Timer Functionality');
console.log('================================================');

// Create two test clients
const client1 = new WebSocket('ws://localhost:3000');
const client2 = new WebSocket('ws://localhost:3000');

let client1Ready = false;
let client2Ready = false;

client1.on('open', () => {
    console.log('✅ Client 1 connected');
    client1Ready = true;
    checkAndStartTest();
});

client2.on('open', () => {
    console.log('✅ Client 2 connected');
    client2Ready = true;
    checkAndStartTest();
});

client1.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('🔵 Client 1 received:', message.type, message);
});

client2.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('🟡 Client 2 received:', message.type, message);
});

function checkAndStartTest() {
    if (client1Ready && client2Ready) {
        setTimeout(runTest, 1000);
    }
}

function runTest() {
    console.log('\n📝 Step 1: Creating room "test"');
    client1.send(JSON.stringify({
        type: 'create_room',
        roomName: 'test'
    }));

    setTimeout(() => {
        console.log('\n📝 Step 2: Client 1 joining room "test" as "Player1"');
        client1.send(JSON.stringify({
            type: 'join_room',
            roomName: 'test',
            username: 'Player1'
        }));
    }, 500);

    setTimeout(() => {
        console.log('\n📝 Step 3: Client 2 joining room "test" as "Player2"');
        client2.send(JSON.stringify({
            type: 'join_room',
            roomName: 'test',
            username: 'Player2'
        }));
    }, 1000);

    setTimeout(() => {
        console.log('\n📝 Step 4: Waiting for timer messages...');
    }, 1500);

    setTimeout(() => {
        console.log('\n📝 Test completed. Closing connections.');
        client1.close();
        client2.close();
        process.exit(0);
    }, 15000);
}

client1.on('error', (err) => console.error('❌ Client 1 error:', err));
client2.on('error', (err) => console.error('❌ Client 2 error:', err));