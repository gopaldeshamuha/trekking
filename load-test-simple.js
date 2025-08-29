const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/',
  method: 'GET'
};

// Test parameters
const numRequests = 100;
const concurrentUsers = 10;
let completed = 0;
let successCount = 0;
let totalResponseTime = 0;

console.log(`Starting load test with ${numRequests} total requests, ${concurrentUsers} concurrent users\n`);

function makeRequest() {
  const startTime = Date.now();
  
  const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
      successCount++;
      totalResponseTime += Date.now() - startTime;
    }
    
    completed++;
    if (completed === numRequests) {
      // Print results
      console.log(`\nTest completed:`);
      console.log(`Success rate: ${(successCount/numRequests * 100).toFixed(2)}%`);
      console.log(`Average response time: ${(totalResponseTime/numRequests).toFixed(2)}ms`);
    } else if (completed % 10 === 0) {
      process.stdout.write('.');
    }
  });
  
  req.on('error', (e) => {
    completed++;
    console.error(`Request failed: ${e.message}`);
  });
  
  req.end();
}

// Start concurrent requests
for (let i = 0; i < numRequests; i++) {
  setTimeout(makeRequest, Math.floor(i / concurrentUsers) * 100);
}
