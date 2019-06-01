'use strict';
const util = require('util');
const assert = require('assert');
const tls = require('tls');
const https = require('https');
const fs = require('fs');
const sslkeylog = require('..');
const delay = util.promisify(setTimeout);
const unlink = util.promisify(fs.unlink);

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
    
    const ver = process.version;
    const major_ver = parseInt(/^v(\d+)/.exec(ver)[1]);
    // This should be updated if Node 10 ever supports TLSv1.3
    const ifTlsv13 = f => (major_ver < 11) ? function() { this.skip() } : f;

    it('works for TLSv1.3', ifTlsv13(withPair(
        { minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3' },
        async function (server, client, lines) {
            if (client.getProtocol() !== 'TLSv1.3')
                return this.skip(); // TLSv1.3 not supported
            assertLinesLength(lines, 5);
        }
    )));
});

describe('sslkeylog API', function(){
    const hello = "Hello, world";
    let server;
    const client_random_line_ws = /^CLIENT_RANDOM [0-9a-f]{64} [0-9a-f]{96}\n$/;
    const client_random_line = /^CLIENT_RANDOM [0-9a-f]{64} [0-9a-f]{96}$/;
    const logFile = `${__dirname}/keys.log`;
    sslkeylog.setLog(logFile);
    // care has to be taken with order of tests, because they have side-effects

    before(async ()=>{
        server = await boundServer(https, { maxVersion: 'TLSv1.2' }, (req, res) => {
            res.writeHead(200);
            res.end(hello);
        });
    });
    after(()=>{
        server.close();
    });

    it('should intercept default agent', async ()=>{
        await unlink(logFile).catch(() => {});

        sslkeylog.hookAgent();
        let req = makeClient(server, https.get, {});
        let [res] = await once(req, 'response');
        assert(client_random_line_ws.test(fs.readFileSync(logFile, 'utf8')));
        res.resume();
        await once(res, 'end');
    });

    it("shouldn't intercept other agent connections", async ()=>{
        await unlink(logFile).catch(() => {});

        let req = makeClient(server, https.get, { agent: false });
        let [res] = await once(req, 'response');
        assert(!fs.existsSync(logFile));
        res.resume();
        await once(res, 'end');
    });

    it('should intercept a particular connection', async ()=>{
        await unlink(logFile).catch(() => {});

        const socket1 = makeClient(server, tls.connect);
        const socket2 = makeClient(server, tls.connect);
        sslkeylog.hookSocket(socket1);
        await Promise.all([ once(socket1, 'secureConnect'),
                            once(socket2, 'secureConnect') ]);
        await delay(50); // FIXME: we need to wait or use appendFileSync
        assert(client_random_line_ws.test(fs.readFileSync(logFile, 'utf8')));
        socket1.destroy();
        socket2.destroy();
    });

    it('should intercept server connections', async ()=>{
        await unlink(logFile).catch(() => {});

        sslkeylog.hookServer(server);
        let req = makeClient(server, https.get, {});
        let [res] = await once(req, 'response');
        const [line1, line2] = fs.readFileSync(logFile, 'utf8').trimRight().split('\n');
        assert.equal(line1, line2);
        assert(client_random_line.test(line1));
        res.resume();
        await once(res, 'end');
    });

    it("shouldn't log the same server or socket twice", async ()=>{
        await unlink(logFile).catch(() => {});

        sslkeylog.hookServer(server); // shouldn't do anything, it's already hooked
        sslkeylog.hookAgent(); // shouldn't do anything, it's already hooked
        let req = makeClient(server, https.get, {});
        const [socket] = await once(req, 'socket');
        sslkeylog.hookSocket(socket); // shouldn't do anything, agent was hooked

        let [res] = await once(req, 'response');
        const [line1, line2] = fs.readFileSync(logFile, 'utf8').trimRight().split('\n');
        assert.equal(line1, line2);
        assert(client_random_line.test(line1));
        res.resume();
        await once(res, 'end');
    });

    it('should intercept all connections', async ()=>{
        await unlink(logFile).catch(() => {});

        sslkeylog.hookAll();
        const socket = makeClient(server, tls.connect);
        await once(socket, 'secureConnect');
        await delay(50); // FIXME: we need to wait or use appendFileSync
        const [line1, line2] = fs.readFileSync(logFile, 'utf8').trimRight().split('\n');
        assert.equal(line1, line2);
        assert(client_random_line.test(line1));
        socket.destroy();
    });

    it("shouldn't intercept all connections twice", async ()=>{
        await unlink(logFile).catch(() => {});

        sslkeylog.hookAll(); // shouldn't do anything this time
        const socket = makeClient(server, tls.connect);
        await once(socket, 'secureConnect');
        await delay(50); // FIXME: we need to wait or use appendFileSync
        const [line1, line2] = fs.readFileSync(logFile, 'utf8').trimRight().split('\n');
        assert.equal(line1, line2);
        assert(client_random_line.test(line1));
        socket.destroy();
    });

});
