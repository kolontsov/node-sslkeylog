# Changelog
All notable changes will be documented in this file.

## next

- use SSLKEYLOGFILE env var as default
- replace `update_log`/`get_session_key` with new `hook*` API
- TLSv1.3 support + implement polyfill for keylog API introduced in Node 12.3
- add compatibility with Node 10.0-10.7 and 12+
- native module no longer built for Node 12.3+
- some refactoring and changes to the build process and C++
- minor API improvements, rename to camel case

## [0.1.1] - 2018-11-23

- testing npm release with Travis-CI
