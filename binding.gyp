{
    "targets": [{
        "target_name": "sslkeylog",
        "cflags!": ["-fno-exceptions"],
        "cflags_cc!": ["-fno-exceptions"],
        # we're accessing internals, disable inlining to prevent crashes
        "cflags": ["-fno-inline -fno-early-inlining"],
        "sources": [
            "src/unwrap_ssl.cpp",
            "src/main.cpp",
        ],
        "include_dirs": [
            "<!@(node -p \"require('node-addon-api').include\")",
            # Backport of https://github.com/nodejs/node-gyp/pull/1055
            "<(node_root_dir)/deps/openssl/config",
            "<(node_root_dir)/deps/openssl/openssl/include",
        ],
        "dependencies": [
            "<!(node -p \"require('node-addon-api').gyp\")"
        ],
        "defines": [
            "NAPI_CPP_EXCEPTIONS",
        ],
        "conditions": [
            ["OS=='mac'", {
                "xcode_settings": {
                    "GCC_ENABLE_CPP_EXCEPTIONS": "YES"
                }
            }]
        ]
    }]
}
