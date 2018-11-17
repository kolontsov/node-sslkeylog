#include <napi.h>
#include <node.h>
#include <tls_wrap.h>
#include <openssl/ssl.h>

using v8::Local;
using v8::Value;
using v8::String;
using v8::Object;
using v8::Isolate;

#if OPENSSL_VERSION_NUMBER < 0x10100000
#error OpenSSL 1.1.0+ required
#endif

class TLSWrap2 : public node::TLSWrap {
    public: SSL *get_ssl(){ return ssl_.get(); }
};

napi_value get_client_random(napi_env env, SSL *ssl) {
    auto buf = Napi::Buffer<unsigned char>::New(env, SSL3_RANDOM_SIZE);
    SSL_get_client_random(ssl, buf.Data(), SSL3_RANDOM_SIZE);
    return buf;
};

napi_value get_master_key(napi_env env, SSL *ssl) {
    auto buf = Napi::Buffer<unsigned char>::New(env, SSL_MAX_MASTER_KEY_LENGTH);
    SSL_SESSION *session = SSL_get_session(ssl);
    SSL_SESSION_get_master_key(session, buf.Data(), SSL_MAX_MASTER_KEY_LENGTH);
    return buf;
};

static Local<Object> v8_local_obj_from_napi_value(napi_value v) {
  Local<Value> local;
  memcpy(&local, &v, sizeof(v));
  return local.As<Object>();
}

static std::string v8_local_obj_ctor(Local<Object> obj) {
    Local<String> ctor = obj->GetConstructorName();
    return *String::Utf8Value(Isolate::GetCurrent(), ctor);
}

Napi::Object get_session_key(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length()<1 || !info[0].IsObject())
        throw Napi::TypeError::New(env, "get_session_key() expects object");
    
    Napi::Value ssl_prop = info[0].As<Napi::Object>().Get("ssl");
    if (!ssl_prop.IsObject())
        throw Napi::TypeError::New(env, "'ssl' property is not an object");

    Local<Object> obj = v8_local_obj_from_napi_value(ssl_prop);
    if (v8_local_obj_ctor(obj)!="TLSWrap")
        throw Napi::TypeError::New(env, "'ssl' property is not TLSWrap");
    TLSWrap2* tls_wrap2 = (TLSWrap2*)obj->GetAlignedPointerFromInternalField(0);
    SSL *ssl = tls_wrap2->get_ssl();

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
