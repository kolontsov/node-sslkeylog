const fs = require('fs');
const E = exports;

try { var sslkeylog = require('./build/Release/sslkeylog.node'); }
catch(e){
    if (e.code!=='MODULE_NOT_FOUND') throw e;
    var sslkeylog = require('./build/Debug/sslkeylog.node');
}

E.get_session_key = sslkeylog.get_session_key;

E.set_log = filename=>{
    E.filename = filename;
    return E;
};

E.update_log = tls_socket=>{
    if (!E.filename)
        return;
    const {client_random, master_key} = sslkeylog.get_session_key(tls_socket);
    const hex1 = client_random.toString('hex');
    const hex2 = master_key.toString('hex');
    fs.appendFileSync('/tmp/sslkeylog.txt', `CLIENT_RANDOM ${hex1} ${hex2}\n`);
};
