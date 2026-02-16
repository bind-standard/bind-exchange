import { decodeProtectedHeader } from "jose";
import { EXCHANGE_ID_BYTES } from "../constants.js";

/** Generate a cryptographically random exchange ID (base64url, 43 chars) */
export function generateExchangeId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(EXCHANGE_ID_BYTES));
  return base64url(bytes);
}

/**
 * Validate that a JWE compact serialization has the expected header:
 * alg: "dir", enc: "A256GCM"
 * Returns the parsed header or throws.
 */
export async function validateJweHeader(jwe: string): Promise<void> {
  const header = decodeProtectedHeader(jwe);
  if (header.alg !== "dir") {
    throw new Error(`Invalid JWE alg: expected "dir", got "${header.alg}"`);
  }
  if (header.enc !== "A256GCM") {
    throw new Error(`Invalid JWE enc: expected "A256GCM", got "${header.enc}"`);
  }
}

/** Compute SHA-256 hash of a string, returned as base64url */
export async function sha256Base64url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64url(new Uint8Array(hash));
}

/** Encode Uint8Array to base64url string (no padding) */
export function base64url(bytes: Uint8Array): string {
  const binString = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(binString).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
