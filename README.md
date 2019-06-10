# node-sslkeylog

[![Build Status](https://travis-ci.org/kolontsov/node-sslkeylog.svg?branch=master)](https://travis-ci.org/kolontsov/node-sslkeylog)

[![NPM](https://nodei.co/npm/sslkeylog.png)](https://nodei.co/npm/sslkeylog/)

> **WARNING:** since 0.2.0, completely new API is implemented (described below). 0.1.x API is not supported anymore.

**sslkeylog** is a module for easy generation of SSLKEYLOG files, which can be used later by Wireshark to decrypt SSL connections. This method works with any TLS cipher suite including elliptic curves crypto, and works regardless of the TLS version.

**sslkeylog** also allows one to use the [keylog API](https://nodejs.org/docs/latest/api/tls.html#tls_event_keylog_1) introduced in Node.JS 12.3.0, in earlier versions of Node (up to v10). See [use as a polyfill](#use-as-a-polyfill).

Further reading about SSLKEYLOG:

* [SSL/TLS Decryption: uncovering secrets](https://sharkfesteurope.wireshark.org/assets/presentations17eu/15.pdf) (PDF, SharkFest'17)
* [Decrypting TLS browser traffic with Wireshark: the easy way](https://jimshaver.net/2015/02/11/decrypting-tls-browser-traffic-with-wireshark-the-easy-way/)

[Node.js](https://nodejs.org/) v10+ is **required**. Tested on v10 (LTS), v11, v12; OS X and Linux.


## Usage

### Getting started

Install the module:

~~~ bash
npm install -g sslkeylog
~~~

Set the `SSLKEYLOGFILE` environment variable as usual:

~~~ bash
export SSLKEYLOGFILE=/tmp/keys.log
~~~

Then in your code, call the `hookAll` function at startup:

~~~ js
require('sslkeylog').hookAll();
~~~

That's it! Run your code and decryption keys will be logged to the specified file.

### Setting log file

If you don't want to use `SSLKEYLOGFILE` or want to override it, you can use `setLog`:

~~~ js
sslkeylog.setLog('/tmp/otherkeys.log').hookAll();
~~~

### Logging specific connections

`hookAll` will log decryption keys for *every TLS connection initiated or received by the Node.JS process*. This is okay for quick debugging, but is bad practice and may fail (because it patches Node.JS internals) or may be inconvenient if you have lots of connections.

Instead of calling `hookAll`, you may use (a combination of) other functions to log only certain connections:

#### Incoming connections to a server

To log all incoming connections to a `tls.Server` (or derivates such as `https.Server`
or `http2.Server`), use `hookServer`:

~~~ js
const myServer = https.createServer(...);

// ...

myServer.listen(...);
sslkeylog.hookServer(myServer);
~~~

#### HTTPS requests

To log outgoing connections for HTTPS requests made by your code, use `hookAgent`:

~~~ js
sslkeylog.hookAgent();
~~~

This will only work for requests that use the default agent. If the requests you're interested in specify a custom `agent`, you must hook this agent instead:

~~~ js
const myAgent = new Agent(...);
sslkeylog.hookAgent(myAgent);

// ...

https.request({ ..., agent: myAgent, ... })

// ...
~~~

#### Specific connections

For more advanced use cases where you want to log a particular connection,
you can pass the created `TLSSocket` to `hookSocket`. For example, with `tls.connect`:

~~~ js
const mySocket = tls.connect(...);
sslkeylog.hookSocket(mySocket);

// ...
~~~

With `http2.connect`:

~~~ js
const http2Session = http2.connect(...);
sslkeylog.hookSocket(http2Session.socket);

// ...
~~~

Note that you **must** call `hookSocket` as soon as the `TLSSocket` is created (in
the same loop tick), otherwise keys may not be logged properly.

### Use as a polyfill

For more advanced use cases, you can use the [keylog API](https://nodejs.org/docs/latest/api/tls.html#tls_event_keylog_1) directly:

 - If you are using Node.JS 12.3.0 or later, you don't need this module at all.
 - If you are using an earlier version of Node.JS, just doing `require('sslkeylog')` will activate the polyfill. Then you can use the API as usual.


## Installation

If you are using Node 12.2.x or earlier, make sure usual compiling tools (`make`, `g++`, etc.) are installed; on Ubuntu / Debian, `sudo apt-get install build-essentials` should suffice.

To use in your project, install as usual:

```$ npm install --save-dev sslkeylog```

...or add to `package.json` and use npm/yarn to do the work.

For dev environment, clone the repository first:

```sh
$ git clone https://github.com/kolontsov/node-sslkeylog
$ cd node-sslkeylog
$ npm install
...
$ cd examples
```

### Demo

Clone the repository, build with `npm install` and go to `examples/` subdir. Open few terminal tabs or tmux/screen windows.

1. 1st terminal: `make server` (starts https server on port 8000)
2. 2nd terminal: `make capture` (starts tcpdump on loopback-interface, port 8000)
3. 3rd terminal: `make req` (curl https://localhost:8000)
4. Stop https server and tcpdump.

Now you have `sslkeylog.txt` (written by https server) and `test.pcap` (written by tcpdump).

Open `test.pcap` in Wireshark, right-click on any TLS packet, choose *Protocol Preferences &rarr; Open Secure Sockets Layer Preferences &rarr; (Pre)-Master-Secret log filename* and fill full path to to `sslkeylog.txt`

Now you can see decrypted packets:

![wireshark screenshot](https://cdn.jsdelivr.net/gh/kolontsov/node-sslkeylog/wireshark.png)


## API reference

### setLog(filename)

 - `filename` (String): Set filename at which (future) decryption keys will be logged.

Sets the log filename.
Returns the module object.

### hookSocket(socket)

 - `socket` (`tls.TLSSocket`): Socket to log decryption keys for.

Log keys for a particular client socket. This method must be called after creating
the socket (i.e. at the same event loop tick) to guarantee that all keys are
logged. Logging the same socket multiple times has no effect.

Returns the passed socket.

### hookServer(server)

 - `server` (`tls.Server`): Server to log decryption keys for.

Log keys for all (future) incoming connections to the passed server.
Logging the same server multiple times has no effect.

Returns the passed server.

### hookAgent(agent)

 - `agent` (`https.Agent | undefined`): Agent to log decryption keys for.

Log keys for all (future) outgoing connections created by the passed agent.
If no agent is passed, `https.globalAgent` will be used.
Returns the patched agent.

### hookAll()

Log every TLS socket that is created. This relies on patching `TLSSocket#_init`,
so it may break and is not guaranteed to remain compatible with future Node.JS releases.
Calling this method multiple times has no effect.


## Project status

### TODO

- windows support?

### Bugs

Not tested on production, use at your own risk. Issues/PRs are welcome.

### License

MIT
