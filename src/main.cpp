#include <napi.h>
#include <openssl/ssl.h>
#include "unwrap_ssl.h"

#if OPENSSL_VERSION_NUMBER < 0x10100000
#error OpenSSL 1.1.0+ required
#endif

Napi::Object get_session_key(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length()<1 || !info[0].IsObject())
        throw Napi::TypeError::New(env, "get_session_key() expects TLSWrap argument");

    SSL* ssl = unwrap_ssl(env, info[0]);
    SSL_SESSION* session = SSL_get_session(ssl);
    if (!session)
        throw Napi::Error::New(env, "No TLS session present");

    auto buf1 = Napi::Buffer<unsigned char>::New(env, SSL3_RANDOM_SIZE);
    SSL_get_client_random(ssl, buf1.Data(), SSL3_RANDOM_SIZE);

    auto buf2 = Napi::Buffer<unsigned char>::New(env, SSL_MAX_MASTER_KEY_LENGTH);
    SSL_SESSION_get_master_key(session, buf2.Data(), SSL_MAX_MASTER_KEY_LENGTH);

    Napi::Object result = Napi::Object::New(env);
    result.Set("client_random", buf1);
    result.Set("master_key", buf2);
    return result;
}

Napi::Object init(Napi::Env env, Napi::Object exports) {
    exports.Set("get_session_key", Napi::Function::New(env, get_session_key));
    return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, init)
