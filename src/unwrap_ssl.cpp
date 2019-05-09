#include "unwrap_ssl.h"

#define NODE_WANT_INTERNALS 1
#include <tls_wrap.h>

using v8::Local;
using v8::Value;
using v8::String;
using v8::Object;
using v8::Isolate;

class TLSWrap2 : public node::TLSWrap {
    public: SSL *get_ssl(){ return &(*ssl_); }
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

SSL* unwrap_ssl(napi_env env, Napi::Object socket) {
    Napi::Value wrap_js = socket.Get("_handle");
    if (!wrap_js.IsObject())
        throw Napi::TypeError::New(env, "'_handle' property is not an object");

    Local<Object> wrap_v8 = v8_local_obj_from_napi_value(wrap_js);
    if (v8_local_obj_ctor(wrap_v8)!="TLSWrap")
        throw Napi::TypeError::New(env, "'_handle' property is not TLSWrap");
    return node::Unwrap<TLSWrap2>(wrap_v8)->get_ssl();
}
