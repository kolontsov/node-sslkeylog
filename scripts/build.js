'use strict';
const common = require('../lib/common');
const https = require('https');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const pipeline = require('util').promisify(require('stream').pipeline);
const TMPDIR = process.env.npm_config_tmp||process.env.TMPDIR||'/tmp';

const download = async (src_url, dest)=>{
    const resp = await new Promise((resolve, reject)=>
        https.get(src_url, resolve).on('error', reject));
    const fsize = parseInt(resp.headers['content-length']);
    if (!fsize)
        throw new Error('Got invalid content-length');
    if (fs.existsSync(dest) && fs.statSync(dest).size==fsize) {
        resp.req.abort();
        return;
    }
    await pipeline(resp, fs.createWriteStream(dest)).catch(e=>{
        fs.unlink(dest);
        throw e;
    });
};

const build_module = async ()=>{
    if (common.nativeApiPresent)
        return console.log('No keylog polyfill necessary, skipping compilation');

    const ver = process.version;
    const major_ver = parseInt(/^v(\d+)/.exec(ver)[1]);

    if (major_ver < 10)
        throw new Error('Node.js v10+ is required');

    const node_url = `https://nodejs.org/download/release/${ver}/node-${ver}.tar.gz`;
    const tarball = `${TMPDIR}/sslkeylog-node-${ver}.tar.gz`;

    console.log(`Downloading Node.JS source into ${tarball}`);
    await download(node_url, tarball);

    console.log('Building native module');
    const result = spawnSync('node-gyp', [`--tarbal=${tarball}`, 'rebuild'],
            { stdio: 'inherit' });

    if (result.error || result.signal)
        throw new Error('Native build failed unexpectedly');
    if (result.status)
        process.exit(result.status);
};

const main = async ()=>{
    try { await build_module(); }
    catch(e) {
        console.log('FATAL ERROR:', e);
        process.exit(1);
    }
};

main();
