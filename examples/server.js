const https = require('https');
const fs = require('fs');
const sslkeylog = require('..');
const port = 8000;
const test_dir = `${__dirname}/../test`;
const ssl_opt = {
    key: fs.readFileSync(`${test_dir}/test.key`),
    cert: fs.readFileSync(`${test_dir}/test.crt`)
};

const req_handler = (req, res)=>{
    console.log('Got request');
    res.writeHead(200);
    res.end('Hello from SSL server\n');
};

sslkeylog.setLog('sslkeylog.txt');

const server = https.createServer(ssl_opt, req_handler);
sslkeylog.hookServer(server);
server.listen(port, ()=>console.log(`Started on port ${port}`));
