{
    "targets": [{
        "target_name": "sslkeylog",
        "cflags!": ["-fno-exceptions"],
        "cflags_cc!": ["-fno-exceptions"],
        "sources": [
            "src/main.cpp",
        ],
        "include_dirs": [
            "<!@(node -p \"require('node-addon-api').include\")",
        ],
        "dependencies": [
            "<!(node -p \"require('node-addon-api').gyp\")"
        ],
        "defines": [
            "NAPI_CPP_EXCEPTIONS", 
            "NODE_WANT_INTERNALS=1",
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
