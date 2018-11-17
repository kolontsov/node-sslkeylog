'use strict';
const assert = require('assert');
const https = require('https');
const path = require('path');
const fs = require('fs');
const sslkeylog = require('../index.js');

describe('sslkeylog', function(){
    const hello = "Hello, world";
    let server, result;
    before(()=>new Promise(resolve=>{
        const ssl_opt = {
            key: fs.readFileSync(`${__dirname}/test.key`),
            cert: fs.readFileSync(`${__dirname}/test.crt`),
            host: '127.0.0.1',
        };
        server = https.createServer(ssl_opt, (req, res)=>{
            res.writeHead(200);
            res.end(hello);
        });
        server.on('secureConnection', socket=>{
            result = sslkeylog.get_session_key(socket);
        });
        server.listen(resolve);
    }));
    after(()=>{
        server.close();
    });
    it('basic', ()=>new Promise(resolve=>{
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
        let req = https.request({port: server.address().port}, res=>{
            let response = [];
            res.on('data', chunk=>response.push(chunk));
            res.on('end', ()=>{
                let str = Buffer.concat(response).toString();
                assert(str==hello);
                assert(result instanceof Object);
                let {client_random, master_key} = result;
                assert(client_random instanceof Buffer);
                assert(client_random.length==32);
                assert(master_key instanceof Buffer);
                assert(master_key.length==48);
                resolve();
            });
        });
        req.end();
    }));
});
