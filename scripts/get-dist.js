'use strict';
const https = require('https');
const execFileSync = require('child_process').execFileSync;
const url = require('url');
const path = require('path');
const fs = require('fs');
const TMPDIR = process.env.npm_config_tmp||process.env.TMPDIR||'/tmp';

const mkdirp = dir=>{
    let prefix = path.dirname(dir);
    if (prefix && !fs.existsSync(prefix))
        mkdirp(prefix);
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir);
};

const download = (src_url, dest)=>new Promise((resolve, reject)=>{
    mkdirp(path.dirname(dest));
    https.get({...url.parse(src_url), encoding: null}, resp=>{
        let fsize = parseInt(resp.headers['content-length']);
        if (!fsize)
            throw new Error('Got invalid content-length');
        if (fs.existsSync(dest) && fs.statSync(dest).size==fsize)
        {
            resp.req.abort();
            return void resolve();
        }
        resp.pipe(fs.createWriteStream(dest))
            .on('close', ()=>resolve())
            .on('error', err=>{ fs.unlink(dest); reject(err); });
    });
});

const download_node = async ()=>{
    const ver = process.version;
    const node_url = `https://nodejs.org/download/release/${ver}/node-${ver}.tar.gz`;
    const tarball = `${TMPDIR}/sslkeylog-node-${ver}.tar.gz`;
    const dest_dir = `${TMPDIR}/sslkeylog-node-${ver}`;

    if (!/^v1[01]/.test(ver))
        throw new Error('Node.js v10+ is required');

    console.log(`Checking Node.js source in ${dest_dir}`);
    let files = ['src/tls_wrap.h', 'src/node_version.h'];
    if (files.every(f=>fs.existsSync(`${dest_dir}/${f}`)))
        return void console.log('Found');
    
    console.log(`Downloading ${tarball}`);
    await download(node_url, tarball);
    console.log('Download finished');

    // TODO: add windows support
    console.log(`Unpacking to ${dest_dir}`);
    mkdirp(dest_dir);
    execFileSync('tar', ['xzf', tarball, '--strip', '1', '-C', dest_dir]);
    console.log('Unpacking done');
};

const main = async ()=>{
    try { await download_node(); }
    catch(e) {
        console.log('FATAL ERROR:', e);
        process.exit(1);
    }
};

main();
