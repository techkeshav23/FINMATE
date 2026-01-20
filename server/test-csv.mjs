// Test CSV upload with user ID header
import http from 'http';
import fs from 'fs';
import path from 'path';

const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
const filePath = path.join('..', 'sample-data', '12-month-sample.csv');
const fileContent = fs.readFileSync(filePath);

const body = Buffer.concat([
  Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="12-month-sample.csv"\r\nContent-Type: text/csv\r\n\r\n`),
  fileContent,
  Buffer.from(`\r\n--${boundary}--\r\n`)
]);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/transactions/upload',
  method: 'POST',
  headers: {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': body.length,
    'X-User-Id': 'test_fresh_user'
  }
};

console.log('Sending upload request with X-User-Id: test_fresh_user');

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(body);
req.end();
