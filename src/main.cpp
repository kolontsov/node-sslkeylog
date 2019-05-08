#include <napi.h>
#include <openssl/ssl.h>
#include "unwrap_ssl.h"

#if OPENSSL_VERSION_NUMBER < 0x10100000
#error OpenSSL 1.1.0+ required
#endif

napi_value get_client_random(napi_env env, SSL *ssl) {
    auto buf = Napi::Buffer<unsigned char>::New(env, SSL3_RANDOM_SIZE);
    SSL_get_client_random(ssl, buf.Data(), SSL3_RANDOM_SIZE);
    return buf;
};

napi_value get_master_key(napi_env env, SSL *ssl) {
    auto buf = Napi::Buffer<unsigned char>::New(env, SSL_MAX_MASTER_KEY_LENGTH);
    SSL_SESSION *session = SSL_get_session(ssl);
    if (!session)
        throw Napi::Error::New(env, "No TLS session present");
    SSL_SESSION_get_master_key(session, buf.Data(), SSL_MAX_MASTER_KEY_LENGTH);
    return buf;
};

Napi::Object get_session_key(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length()<1 || !info[0].IsObject())
        throw Napi::TypeError::New(env, "get_session_key() expects object");

    SSL* ssl = unwrap_ssl(env, info[0].As<Napi::Object>());

    Napi::Object result = Napi::Object::New(env);   
    result.Set("client_random", get_client_random(env, ssl));
    result.Set("master_key", get_master_key(env, ssl));
    return result;
}

Napi::Object init(Napi::Env env, Napi::Object exports) {
    exports.Set("get_session_key", Napi::Function::New(env, get_session_key));
    return exports;
}

NODE_API_MODULE(sslkeylog, init)
