const io = require('socket.io-client');

/**
 * Quick metrics test - runs faster but less comprehensive
 * Good for getting baseline numbers quickly
 */

class QuickMetricsTester {
    constructor(serverUrl = 'http://localhost:3000') {
        this.serverUrl = serverUrl;
        this.clients = [];
    }

    async testConcurrency(target = 250) {
        console.log(`\n🔄 Quick Concurrency Test (${target} connections)...`);
        const startTime = Date.now();
        let connected = 0;
        let failed = 0;

        for (let i = 0; i < target; i++) {
            try {
                const client = await this.createClient(i);
                this.clients.push(client);
                connected++;
                if (i % 50 === 0) console.log(`   ${connected} connected...`);
            } catch (e) {
                failed++;
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Connected ${connected}/${target} in ${duration}s (${failed} failed)`);
        return { connected, failed, duration };
    }

    async testLatency(samples = 100) {
        console.log(`\n⏱️  Quick Latency Test (${samples} samples)...`);
        const latencies = [];
        
        const testClients = this.clients.slice(0, Math.min(20, this.clients.length));
        
        for (let i = 0; i < samples; i++) {
            const client = testClients[i % testClients.length];
            const start = Date.now();
            
            await new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(), 1000);
                client.once('pong', () => {
                    latencies.push(Date.now() - start);
                    clearTimeout(timeout);
                    resolve();
                });
                client.emit('ping', { timestamp: Date.now() });
            });

            if (i % 20 === 0) console.log(`   ${i} samples collected...`);
        }

        latencies.sort((a, b) => a - b);
        const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        const p95 = latencies[Math.floor(latencies.length * 0.95)];
        const p99 = latencies[Math.floor(latencies.length * 0.99)];

        console.log(`✅ Avg: ${avg.toFixed(2)}ms | P95: ${p95}ms | P99: ${p99}ms`);
        return { avg, p95, p99, samples: latencies.length };
    }

    async testThroughput(duration = 30000) {
        console.log(`\n📊 Quick Throughput Test (${duration/1000}s)...`);
        
        let eventCount = 0;
        const startTime = Date.now();
        const testClients = this.clients.slice(0, Math.min(50, this.clients.length));

        const generators = testClients.map(async (client) => {
            while (Date.now() - startTime < duration) {
                client.emit('gameEvent', { 
                    userId: client.userId, 
                    action: 'move',
                    timestamp: Date.now() 
                });
                eventCount++;
                await new Promise(r => setTimeout(r, 50 + Math.random() * 50));
            }
        });

        await Promise.all(generators);

        const actualDuration = (Date.now() - startTime) / 1000;
        const eps = eventCount / actualDuration;
        const epm = eps * 60;

        console.log(`✅ ${eventCount} events in ${actualDuration.toFixed(2)}s`);
        console.log(`   ${eps.toFixed(2)} events/second | ${epm.toFixed(2)} events/minute`);
        
        return { eventCount, eps, epm, duration: actualDuration };
    }

    async createClient(id) {
        return new Promise((resolve, reject) => {
            const client = io(this.serverUrl, {
                transports: ['websocket'],
                timeout: 3000
            });

            const timeout = setTimeout(() => {
                client.close();
                reject(new Error('Timeout'));
            }, 3000);

            client.on('connect', () => {
                clearTimeout(timeout);
                client.userId = `user_${id}`;
                // Setup ping/pong handler
                client.on('ping', () => client.emit('pong', { timestamp: Date.now() }));
                resolve(client);
            });

            client.on('connect_error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up...');
        this.clients.forEach(c => c.close());
        this.clients = [];
    }

    async runQuickTest() {
        console.log('═══════════════════════════════════════════════════════');
        console.log('   QUICK METRICS TEST');
        console.log('═══════════════════════════════════════════════════════');

        try {
            const concurrency = await this.testConcurrency(250);
            await new Promise(r => setTimeout(r, 2000));

            const latency = await this.testLatency(100);
            await new Promise(r => setTimeout(r, 2000));

            const throughput = await this.testThroughput(30000);

            console.log('\n═══════════════════════════════════════════════════════');
            console.log('   QUICK RESULTS SUMMARY');
            console.log('═══════════════════════════════════════════════════════');
            console.log(`\n📊 Concurrent Connections: ${concurrency.connected}`);
            console.log(`⏱️  Average Latency: ${latency.avg.toFixed(2)}ms`);
            console.log(`📈 Events/Minute: ${throughput.epm.toFixed(0)}`);
            console.log('\n═══════════════════════════════════════════════════════\n');

        } finally {
            await this.cleanup();
        }
    }
}

if (require.main === module) {
    const serverUrl = process.argv[2] || 'http://localhost:3000';
    const tester = new QuickMetricsTester(serverUrl);
    
    tester.runQuickTest().then(() => {
        console.log('✅ Quick test completed');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });
}

module.exports = QuickMetricsTester;
