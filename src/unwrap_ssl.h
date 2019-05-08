#ifndef __UNWRAP_SSL_H_
#define __UNWRAP_SSL_H_

#include <napi.h>
#include <openssl/ssl.h>

/**
 * Returns the OpenSSL context for a given N-API value referring
 * to a `tls.TLSSocket` object.
 */
SSL* unwrap_ssl(napi_env env, Napi::Object socket);

#endif
