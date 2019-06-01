#include "unwrap_ssl.h"

#define NODE_WANT_INTERNALS 1
#include <tls_wrap.h>

using v8::Local;
using v8::Value;
using v8::String;
using v8::Object;
using v8::Isolate;
using v8::HandleScope;

#if NODE_VERSION_AT_LEAST(10,2,0)
#define UNWRAP_PTR(x) (x).get()
#else
#define UNWRAP_PTR(x) (x)
#endif

class TLSWrap2 : public node::TLSWrap {
    public:
    SSL* get_ssl(){ return UNWRAP_PTR(ssl_); }
    SSL_CTX* get_ctx(){ return UNWRAP_PTR(sc_->ctx_); }
    node::Environment* get_env(){ return ssl_env(); }
};

static std::string v8_local_obj_ctor(Local<Object> obj) {
    Local<String> ctor = obj->GetConstructorName();
    return *String::Utf8Value(Isolate::GetCurrent(), ctor);
}

static Local<Object> v8_local_obj_from_napi_value(napi_value v) {
    Local<Value> local;
    memcpy(&local, &v, sizeof(v));
    return local.As<Object>();
}

SSL* unwrap_ssl(napi_env env, napi_value wrap) {
    Local<Object> wrap_v8 = v8_local_obj_from_napi_value(wrap);
    if (v8_local_obj_ctor(wrap_v8)!="TLSWrap")
        throw Napi::TypeError::New(env, "'_handle' property is not TLSWrap");
    return node::Unwrap<TLSWrap2>(wrap_v8)->get_ssl();
}

SSL_CTX* unwrap_ssl_ctx(napi_env env, napi_value wrap) {
    Local<Object> wrap_v8 = v8_local_obj_from_napi_value(wrap);
    if (v8_local_obj_ctor(wrap_v8)!="TLSWrap")
        throw Napi::TypeError::New(env, "'_handle' property is not TLSWrap");
    return node::Unwrap<TLSWrap2>(wrap_v8)->get_ctx();
}

void call_with_data(const SSL* s, const char* name, const char* data, size_t size) {
    TLSWrap2* w = static_cast<TLSWrap2*>(SSL_get_app_data(s));
    node::Environment* env = w->get_env();
    Isolate* isolate = Isolate::GetCurrent(); // env->isolate() returns an invalid(?) one on Release builds
    HandleScope handle_scope(isolate);
    //Context::Scope context_scope(env->context()); // same with env->context()

    Local<String> method = String::NewFromUtf8(isolate, name, v8::NewStringType::kNormal).ToLocalChecked();
    Local<Value> buffer = node::Buffer::Copy(env, data, size).ToLocalChecked();
    w->MakeCallback(method, 1, &buffer);
}
