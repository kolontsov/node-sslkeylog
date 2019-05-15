#ifndef __UNWRAP_SSL_H_
#define __UNWRAP_SSL_H_

#include <napi.h>
#include <openssl/ssl.h>

/**
 * Returns the OpenSSL connection for a given N-API value referring
 * to a `TLSWrap` object.
 */
SSL* unwrap_ssl(napi_env env, napi_value wrap);

/**
 * Returns the OpenSSL context for a given N-API value referring
 * to a `TLSWrap` object.
 */
SSL_CTX* unwrap_ssl_ctx(napi_env env, napi_value wrap);

/**
 * Call the passed property on the `TLSWrap` object associated with
 * the SSL connection. The method will be called with a single `Buffer`
 * argument containing the supplied data.
 */
void call_with_data(const SSL* s, const char* name, const char* data, size_t size);

#endif
