#ifndef __UNWRAP_SSL_H_
#define __UNWRAP_SSL_H_

#include <napi.h>
#include <openssl/ssl.h>

/**
 * Returns the OpenSSL connection for a given N-API value referring
 * to a `TLSWrap` object.
 */
SSL* unwrap_ssl(napi_env env, napi_value wrap);

#endif
