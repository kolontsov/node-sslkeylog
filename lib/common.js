const tls = require('tls');

// Determine if native API present
const socket = tls.connect({ port: 1 });
exports.nativeApiPresent = (typeof socket._handle.enableKeylogCallback !== 'undefined');
socket.destroy();

// Logic to load native addon
exports.loadNativeAddon = () => {
    try {
        return require('../build/Release/sslkeylog.node');
    } catch(e) {
        if (e.code!=='MODULE_NOT_FOUND') throw e;
        return require('../build/Debug/sslkeylog.node');
    }
};

// Logic to patch TLSSocket constructor
exports.patchSocket = (beforeInit, afterInit) => {
    // For now we'll do it by patching _init()... not exactly like
    // patching constructor, but close and less invasive.
    const original = tls.TLSSocket.prototype._init;
    tls.TLSSocket.prototype._init = function() {
        beforeInit.call(this);
        const ret = original.apply(this, arguments);
        afterInit.call(this);
        return ret;
    };
};
