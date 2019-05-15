'use strict';
const util = require('util');
const assert = require('assert');
const tls = require('tls');
const https = require('https');
const path = require('path');
const fs = require('fs');
const sslkeylog = require('../index.js');

const renegotiate = util.promisify( (socket, ...args) => assert(socket.renegotiate(...args)) );
const once = (obj, event)=>new Promise((resolve, reject)=>{
    function listener() {
        resolve(Array.from(arguments));
        obj.removeListener('error', errorListener);
    }
    function errorListener(err) {
        reject(err);
        obj.removeListener(event, listener);
    }
    obj.once(event, listener).once('error', errorListener);
});

const boundServer = async (type, options, ...args) => {
    const server = type.createServer({
        key: fs.readFileSync(`${__dirname}/test.key`),
        cert: fs.readFileSync(`${__dirname}/test.crt`),
        ...options,
    }, ...args).listen();
    return once(server, 'listening').then(() => server);
};
const makeClient = (server, func, options) => func({
    port: server.address().port,
    rejectUnauthorized: false,
    ...options,
});

describe('keylog API polyfill', function() {
    const assertLinesLength = (lines, length) => {
        assert.equal(lines.client.length, length);
        assert.equal(lines.server.length, length);
    };
    const withPair = (options, body) => async function() {
        const server = await boundServer(tls, options, conn => conn.resume());
        const client = makeClient(server, tls.connect, options);
        try {
            let lines = { client: [], server: [] };
            client.on('keylog', line => lines.client.push(line));
            server.on('keylog', line => lines.server.push(line));
            await Promise.all([ once(server, 'secureConnection'),
                                once(client, 'secureConnect') ]);
            await body.call(this, server, client, lines);
            lines.client.concat(lines.server).forEach(line =>
                assert(Buffer.isBuffer(line) && line.length > 1 && line[line.length-1] === 0x0A));
        } finally {
            server.close();
            client.end();
        }
    };
    
    it('works for TLSv1.2 and renegotiations', withPair(
        { maxVersion: 'TLSv1.2' },
        async (server, client, lines) => {
            assertLinesLength(lines, 1);

            client.write('hello'); // otherwise renegotiation doesn't work
            await renegotiate(client, { rejectUnauthorized: false });
            assertLinesLength(lines, 2);
        }
    ));
    
    it('works for TLSv1.3', withPair(
        { minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3' },
        async function (server, client, lines) {
            if (client.getProtocol() !== 'TLSv1.3')
                return this.skip(); // TLSv1.3 not supported
            assertLinesLength(lines, 5);
        }
    ));
});

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
