const fs = require('fs');
const E = exports;

require('./lib/polyfill');

E.filename = process.env.SSLKEYLOGFILE;

E.set_log = filename=>{
    E.filename = filename;
    return E;
};

E.log_line = line => fs.appendFile(E.filename, line, err => {
    if (err) console.error('Warning: Failed to log to SSLKEYLOGFILE:', err);
});

const uniqueOn = (obj, event, listener) => {
    if (obj.rawListeners(event).indexOf(listener) === -1)
        obj.on(event, listener);
    return obj;
};

E.hook_server = server => uniqueOn(server, 'keylog', E.log_line);
E.hook_socket = socket => uniqueOn(socket, 'keylog', E.log_line);

E.hook_agent = agent=>{
    const hook = socket => socket ? E.hook_socket(socket) : socket;
    const original = agent.createConnection.bind(agent);
    agent.createConnection = (options, callback) =>
        hook(original(options, (err, socket) => callback(err, hook(socket))));
};
