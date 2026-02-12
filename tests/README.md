# Load Testing Suite for Ludo Multiplayer Backend

This testing suite measures real performance metrics for your resume.

## 📋 Prerequisites

```bash
npm install socket.io-client --save-dev
```

## 🚀 Running Tests

### Option 1: Comprehensive Test (30-45 minutes)
Tests all 4 metric areas thoroughly:

```bash
# Make sure your server is running first
npm start

# In another terminal:
node tests/load-test.js
```

This will test:
- ✅ **Concurrency**: 500 concurrent connections
- ✅ **Latency**: 30 seconds of latency measurements
- ✅ **Throughput**: 60 seconds of event processing
- ✅ **Reliability**: Race conditions, message ordering, state consistency

### Option 2: Quick Test (5-10 minutes)
Faster baseline metrics:

```bash
node tests/quick-metrics.js
```

This provides:
- 250 concurrent connections
- 100 latency samples
- 30 seconds throughput test

### Option 3: Individual Tests

```javascript
const LoadTester = require('./tests/load-test');
const tester = new LoadTester('http://localhost:3000');

// Test only concurrency
await tester.testConcurrency(500, 50);

// Test only latency
await tester.testLatency(30000);

// Test only throughput
await tester.testThroughput(60000);

// Test only reliability
await tester.testReliability(30000);

await tester.cleanup();
```

## 📊 What Gets Measured

### 1. Concurrency Metrics
- Maximum concurrent WebSocket connections
- Number of active game rooms
- Connection success rate
- Failed connection count

### 2. Latency Metrics
- Average event broadcast time
- P95 (95th percentile) response time
- P99 (99th percentile) response time
- Individual event latencies

### 3. Throughput Metrics
- Events processed per second
- Events processed per minute
- Total events handled
- Event distribution over time

### 4. Reliability Metrics
- Race condition detection
- State inconsistency count
- Message ordering violations
- Operation success/failure rates

## 📝 Expected Output

The test will print a final report with **resume-ready metrics** like:

```
═══════════════════════════════════════════════════════
   RESUME-READY METRICS
═══════════════════════════════════════════════════════

✅ CONCURRENCY:
   "Handled 500+ concurrent WebSocket connections"
   "Supported 125+ active game rooms simultaneously"

✅ LATENCY:
   "Achieved <85ms average event broadcast latency"
   "Maintained sub-120ms P95 response time under load"

✅ THROUGHPUT:
   "Processed 2,400+ real-time events per minute"
   "Handled 40+ events per second"

✅ RELIABILITY:
   "Prevented race conditions using Redis atomic operations"
   "Zero state desynchronization in 1,500 operations"

═══════════════════════════════════════════════════════
```

## 🔧 Customization

### Adjust Test Parameters

**Concurrency:**
```javascript
await tester.testConcurrency(1000, 100); // 1000 clients, 100 per batch
```

**Latency:**
```javascript
await tester.testLatency(60000); // 60 second duration
```

**Throughput:**
```javascript
await tester.testThroughput(120000); // 120 second duration
```

### Test Against Different Server

```bash
node tests/load-test.js http://your-server:3000
```

## 💡 Tips for Best Results

1. **Server Resources**: Ensure your server has adequate resources
   - Recommended: 4GB+ RAM, 2+ CPU cores
   - Close unnecessary applications

2. **Redis**: Make sure Redis is running and properly configured

3. **Database**: PostgreSQL should be optimized for concurrent connections

4. **Network**: Test on localhost for best latency results
   - For production testing, adjust expectations for network latency

5. **Multiple Runs**: Run tests 2-3 times and use the best consistent results

## 🐛 Troubleshooting

### "Connection refused" errors
- Ensure server is running: `npm start`
- Check server is listening on correct port (default: 3000)

### "Too many connections" errors
- Reduce concurrent connection count
- Increase server's connection limit
- Check your OS file descriptor limit

### High latency results
- Test on localhost first
- Check server CPU/memory usage
- Ensure Redis is running locally
- Close other applications

### Low throughput numbers
- Increase test duration
- Use more test clients
- Check server is not rate-limiting

## 📈 Interpreting Results

### Good Benchmarks:
- **Concurrency**: 200+ connections for small VPS, 500+ for dedicated server
- **Latency**: <100ms average, <150ms P95 for localhost
- **Throughput**: 1000+ events/minute per 100 clients
- **Reliability**: 0 race conditions, 0 inconsistencies

### Realistic Production Values:
- **Concurrency**: 100-500 (depending on server)
- **Latency**: 80-200ms (depending on network)
- **Throughput**: 1500-3000 events/minute
- **Reliability**: Near-zero issues with Redis locks

## 📄 Using Metrics in Resume

Copy the "RESUME-READY METRICS" section directly, or customize like:

```
Built real-time multiplayer game backend supporting:
• 500+ concurrent WebSocket connections with 99.5% uptime
• <120ms P95 latency for game state synchronization
• Processing 2,000+ real-time events/minute without state conflicts
• Zero race conditions using Redis distributed locks and pub/sub
• Maintained message ordering guarantees across distributed sessions
```

## 🔍 Advanced: Monitoring During Tests

Watch server metrics in real-time:

```bash
# Monitor CPU/Memory
top -p $(pgrep -f "node src/server.js")

# Monitor Redis
redis-cli MONITOR

# Monitor connections
netstat -an | grep :3000 | wc -l
```

## 📦 Test Files

- `load-test.js` - Comprehensive testing suite (all metrics)
- `quick-metrics.js` - Fast baseline testing (~5 minutes)
- `README.md` - This file

## 🤝 Contributing

Feel free to adjust test parameters or add new test cases based on your specific use cases.
