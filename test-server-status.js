const http = require('http');

console.log('🔍 Testing Server Status...\n');

// Test health endpoint
function testHealth() {
    return new Promise((resolve) => {
        console.log('1️⃣ Testing health endpoint...');
        
        const options = {
            hostname: 'localhost',
            port: 9000,
            path: '/health',
            method: 'GET',
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('✅ Health endpoint: OK');
                    try {
                        const health = JSON.parse(data);
                        console.log(`   Server uptime: ${Math.round(health.uptime)}s`);
                        console.log(`   Environment: ${health.environment}`);
                    } catch (e) {
                        console.log('   Response:', data.substring(0, 100) + '...');
                    }
                } else {
                    console.log(`❌ Health endpoint: HTTP ${res.statusCode}`);
                }
                resolve();
            });
        });

        req.on('error', (err) => {
            console.log(`❌ Health endpoint: ${err.message}`);
            resolve();
        });

        req.on('timeout', () => {
            console.log('❌ Health endpoint: Timeout');
            req.destroy();
            resolve();
        });

        req.end();
    });
}

// Test Socket.IO endpoint
function testSocketIO() {
    return new Promise((resolve) => {
        console.log('\n2️⃣ Testing Socket.IO endpoint...');
        
        const options = {
            hostname: 'localhost',
            port: 9000,
            path: '/socket.io/',
            method: 'GET',
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            if (res.statusCode === 200) {
                console.log('✅ Socket.IO endpoint: OK');
            } else {
                console.log(`❌ Socket.IO endpoint: HTTP ${res.statusCode}`);
            }
            resolve();
        });

        req.on('error', (err) => {
            console.log(`❌ Socket.IO endpoint: ${err.message}`);
            resolve();
        });

        req.on('timeout', () => {
            console.log('❌ Socket.IO endpoint: Timeout');
            req.destroy();
            resolve();
        });

        req.end();
    });
}

// Test admin meetings endpoint
function testAdminMeetings() {
    return new Promise((resolve) => {
        console.log('\n3️⃣ Testing admin meetings endpoint...');
        
        const options = {
            hostname: 'localhost',
            port: 9000,
            path: '/admin/meetings',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 401) {
                    console.log('✅ Admin meetings endpoint: OK (requires authentication)');
                } else if (res.statusCode === 200) {
                    console.log('✅ Admin meetings endpoint: OK');
                } else {
                    console.log(`❌ Admin meetings endpoint: HTTP ${res.statusCode}`);
                }
                resolve();
            });
        });

        req.on('error', (err) => {
            console.log(`❌ Admin meetings endpoint: ${err.message}`);
            resolve();
        });

        req.on('timeout', () => {
            console.log('❌ Admin meetings endpoint: Timeout');
            req.destroy();
            resolve();
        });

        req.end();
    });
}

// Test employee meetings endpoint
function testEmployeeMeetings() {
    return new Promise((resolve) => {
        console.log('\n4️⃣ Testing employee meetings endpoint...');
        
        const options = {
            hostname: 'localhost',
            port: 9000,
            path: '/emp/meetings',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 401) {
                    console.log('✅ Employee meetings endpoint: OK (requires authentication)');
                } else if (res.statusCode === 200) {
                    console.log('✅ Employee meetings endpoint: OK');
                } else {
                    console.log(`❌ Employee meetings endpoint: HTTP ${res.statusCode}`);
                }
                resolve();
            });
        });

        req.on('error', (err) => {
            console.log(`❌ Employee meetings endpoint: ${err.message}`);
            resolve();
        });

        req.on('timeout', () => {
            console.log('❌ Employee meetings endpoint: Timeout');
            req.destroy();
            resolve();
        });

        req.end();
    });
}

// Check if port is listening
function checkPort() {
    return new Promise((resolve) => {
        console.log('\n5️⃣ Checking if server is listening on port 9000...');
        
        const net = require('net');
        const client = new net.Socket();
        
        client.setTimeout(5000);
        
        client.connect(9000, 'localhost', () => {
            console.log('✅ Port 9000: Server is listening');
            client.destroy();
            resolve();
        });
        
        client.on('timeout', () => {
            console.log('❌ Port 9000: Connection timeout');
            client.destroy();
            resolve();
        });
        
        client.on('error', (err) => {
            console.log(`❌ Port 9000: ${err.message}`);
            resolve();
        });
    });
}

// Run all tests
async function runTests() {
    await checkPort();
    await testHealth();
    await testSocketIO();
    await testAdminMeetings();
    await testEmployeeMeetings();
    
    console.log('\n🎯 Test Summary:');
    console.log('If you see mostly ✅ marks, your server is working correctly!');
    console.log('If you see ❌ marks, there might be issues to fix.');
    console.log('\n📋 Next Steps:');
    console.log('1. Open socket-test.html in your browser to test Socket.IO');
    console.log('2. Use the WebRTC testing guide for comprehensive testing');
    console.log('3. Check the database connection if endpoints return 500 errors');
}

runTests().catch(console.error);
