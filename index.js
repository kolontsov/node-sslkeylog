const common = require('./lib/common');
const fs = require('fs');
const E = exports;

require('./lib/polyfill');

E.filename = process.env.SSLKEYLOGFILE;

E.setLog = filename => {
    E.filename = filename;
    return E;
};

E.logLine = line => fs.appendFile(E.filename, line, err => {
    if (err) console.error('Warning: Failed to log to SSLKEYLOGFILE,', err.message);
});

const uniqueOn = (obj, event, listener) => {
    if (obj.rawListeners(event).indexOf(listener) === -1)
        obj.on(event, listener);
    return obj;
};

E.hookServer = server => uniqueOn(server, 'keylog', E.logLine);
E.hookSocket = socket => uniqueOn(socket, 'keylog', E.logLine);

E.hookAgent = agent => {
    if (!agent)
        agent = require('https').globalAgent;
    const hook = socket => socket ? E.hookSocket(socket) : socket;
    const original = agent.createConnection.bind(agent);
    agent.createConnection = (options, callback) =>
        hook(original(options, (err, socket) => callback(err, hook(socket))));
    return agent;
};

E.hookAll = () => common.patchSocket(function () {
    E.hookSocket(this);
});
