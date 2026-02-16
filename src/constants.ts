/** Default expiry: 72 hours in seconds */
export const DEFAULT_EXPIRY_SECONDS = 72 * 60 * 60;

/** Maximum expiry: 1 year + 1 day in seconds (trusted) */
export const MAX_EXPIRY_SECONDS = 366 * 24 * 60 * 60;

/** Maximum passcode verification attempts before lockout */
export const MAX_ATTEMPTS = 10;

/** Generated passcode length (digits) */
export const PASSCODE_LENGTH = 6;

/** PBKDF2 iteration count (OWASP recommendation for SHA-256) */
export const PBKDF2_ITERATIONS = 310_000;

/** Salt length in bytes for PBKDF2 */
export const PBKDF2_SALT_LENGTH = 16;

/** Exchange ID length in bytes (produces 43-char base64url string) */
export const EXCHANGE_ID_BYTES = 32;

/** R2 key prefix for exchange payloads */
export const R2_PREFIX = "exchanges";

/** KV key prefix for exchange metadata */
export const KV_PREFIX = "exchange";

/** Maximum payload size (5 MB) — trusted exchanges */
export const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024;

// --- Untrusted tier (unsigned or unverifiable exchanges) ---

/** Untrusted expiry: 1 hour in seconds */
export const UNTRUSTED_EXPIRY_SECONDS = 60 * 60;

/** Untrusted maximum payload size (10 KB) */
export const UNTRUSTED_MAX_PAYLOAD_SIZE = 10 * 1024;

// --- Trust gateway ---

/** BIND Trust Gateway base URL for JWKS discovery */
export const TRUST_GATEWAY_URL = "https://bind-pki.org";
