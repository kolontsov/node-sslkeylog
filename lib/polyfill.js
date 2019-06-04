const common = require('./common');

// If the native API is present, we don't need to polyfill
if (common.nativeApiPresent)
    return;

const native = common.loadNativeAddon();
let polyfillKeylog;

if (native.enable_keylog_callback) {
    // The keylog API is available natively, we just have to expose it!
    polyfillKeylog = socket => {
        const ssl = socket._handle;
        ssl.onkeylog = (line) => emitKeylog(socket, line);
        native.enable_keylog_callback(ssl);
    };
} else {
    // No keylog API, but this also means OpenSSL doesn't support TLSv1.3.
    // Since all connections will be TLSv1.2 or older, we can emulate the
    // keylog API by manually generating a `CLIENT_RANDOM` line after the
    // handshake (and after renegotiations).
    polyfillKeylog = socket => {
        // Use the undocumented 'secure' event, with is emitted before Node.JS
        // makes final checks and emits 'secureConnect' or 'secureConnection'.
        socket.prependListener('secure', () =>
            emitKeylog(socket, dumpKey(socket)));
    };

    function dumpKey(socket) {
        const data = native.get_session_key(socket._handle);
        const rand = data.client_random.toString('hex');
        const key = data.master_key.toString('hex');
        return Buffer.from(`CLIENT_RANDOM ${rand} ${key}\n`);
    }
}

// Patch the socket constructor to invoke the polyfill when needed
common.patchSocket(() => {}, function() {
    if (this._tlsOptions.isServer) {
        if (this.server && this.server.listenerCount('keylog') > 0)
            polyfillKeylog(this);
    } else {
        this.on('newListener', newListener);
        function newListener(event) {
            if (event !== 'keylog')
                return;
            polyfillKeylog(this);
            this.removeListener('newListener', newListener);
        }
    }
});

function emitKeylog(socket, line) {
    if (socket._tlsOptions.isServer)
        socket.server.emit('keylog', line, socket);
    else
        socket.emit('keylog', line);
}
