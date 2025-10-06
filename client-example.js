const WebSocket = require('ws');

// Simple WebSocket client example for testing
class WebSocketClient {
    constructor(url = 'ws://localhost:3000') {
        this.url = url;
        this.ws = null;
        this.isConnected = false;
        this.playerId = `TestPlayer_${Math.floor(Math.random() * 1000)}`;
    }
    
    connect() {
        console.log(`🔌 Connecting to ${this.url}...`);
        this.ws = new WebSocket(this.url);
        
        this.ws.on('open', () => {
            this.isConnected = true;
            console.log('✅ Connected to WebSocket server');
            
            // Send a welcome message
            this.sendMessage({
                type: 'chat',
                message: `${this.playerId} has joined the game!`,
                sender: this.playerId
            });
        });
        
        this.ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleMessage(message);
            } catch (error) {
                console.error('❌ Error parsing message:', error);
            }
        });
        
        this.ws.on('close', (code, reason) => {
            this.isConnected = false;
            console.log(`🔌 Connection closed: ${code} - ${reason}`);
        });
        
        this.ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error);
        });
    }
    
    disconnect() {
        if (this.isConnected && this.ws) {
            console.log('🔌 Disconnecting...');
            this.ws.close();
        }
    }
    
    sendMessage(message) {
        if (this.isConnected && this.ws) {
            this.ws.send(JSON.stringify(message));
            console.log('📤 Sent:', message.type, message.message || message.move || 'ping');
        } else {
            console.log('❌ Not connected - cannot send message');
        }
    }
    
    handleMessage(message) {
        const timestamp = new Date(message.timestamp).toLocaleTimeString();
        
        switch (message.type) {
            case 'welcome':
                console.log(`🎉 ${message.message} (Clients: ${message.clientCount})`);
                break;
                
            case 'chat':
                if (message.sender !== this.playerId) {
                    console.log(`💬 [${timestamp}] ${message.sender}: ${message.message}`);
                }
                break;
                
            case 'user_joined':
            case 'user_left':
                console.log(`👥 [${timestamp}] ${message.message} (Clients: ${message.clientCount})`);
                break;
                
            case 'game_move':
                if (message.player !== this.playerId) {
                    if (message.move === 'dice_roll') {
                        console.log(`🎲 [${timestamp}] ${message.player} rolled: ${message.value}`);
                    } else if (message.move === 'piece_move') {
                        console.log(`♟️  [${timestamp}] ${message.player} moved piece ${message.piece}`);
                    } else {
                        console.log(`🎮 [${timestamp}] ${message.player} made move: ${JSON.stringify(message.move)}`);
                    }
                }
                break;
                
            case 'pong':
                console.log('🏓 Pong received');
                break;
                
            case 'error':
                console.log(`❌ Server error: ${message.message}`);
                break;
                
            default:
                console.log('❓ Unknown message type:', message);
        }
    }
    
    // Test methods
    sendChat(message) {
        this.sendMessage({
            type: 'chat',
            message: message,
            sender: this.playerId
        });
    }
    
    rollDice() {
        const value = Math.floor(Math.random() * 6) + 1;
        this.sendMessage({
            type: 'game_move',
            move: 'dice_roll',
            player: this.playerId,
            value: value
        });
    }
    
    movePiece(pieceNumber) {
        this.sendMessage({
            type: 'game_move',
            move: 'piece_move',
            player: this.playerId,
            piece: pieceNumber
        });
    }
    
    ping() {
        this.sendMessage({
            type: 'ping'
        });
    }
    
    // Demo sequence
    runDemo() {
        if (!this.isConnected) {
            console.log('❌ Not connected. Call connect() first.');
            return;
        }
        
        console.log('🎮 Starting demo sequence...');
        
        // Demo sequence with delays
        setTimeout(() => this.sendChat('Hello everyone!'), 1000);
        setTimeout(() => this.rollDice(), 2000);
        setTimeout(() => this.movePiece(1), 3000);
        setTimeout(() => this.rollDice(), 4000);
        setTimeout(() => this.movePiece(2), 5000);
        setTimeout(() => this.ping(), 6000);
        setTimeout(() => this.sendChat('Demo complete!'), 7000);
    }
}

// Example usage
if (require.main === module) {
    const client = new WebSocketClient();
    
    // Connect and run demo
    client.connect();
    
    // Wait for connection, then run demo
    setTimeout(() => {
        if (client.isConnected) {
            client.runDemo();
            
            // Disconnect after demo
            setTimeout(() => {
                client.disconnect();
                process.exit(0);
            }, 10000);
        }
    }, 1500);
    
    // Handle process termination
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down...');
        client.disconnect();
        process.exit(0);
    });
}

module.exports = WebSocketClient;