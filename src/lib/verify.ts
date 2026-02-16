import { createRemoteJWKSet, decodeJwt, decodeProtectedHeader, jwtVerify } from "jose";
import { TRUST_GATEWAY_URL } from "../constants.js";
import { sha256Base64url } from "./crypto.js";

export interface VerificationResult {
  trusted: boolean;
  iss?: string;
}

/**
 * Verify an exchange proof JWT.
 *
 * The proof is a compact JWS (ES256) with:
 *   - Header: { alg: "ES256", kid: "<key-id>" }
 *   - Payload: { iss: "<issuer-id>", sub: "<sha256-base64url-of-jwe>", iat: <timestamp> }
 *
 * The server:
 *   1. Decodes the proof to extract `iss`
 *   2. Fetches JWKS from https://bind-pki.org/{iss}/.well-known/jwks.json
 *   3. Verifies the JWT signature with the issuer's public key
 *   4. Confirms `sub` matches SHA-256 of the JWE payload (binds proof to this exchange)
 *
 * Returns { trusted: true, iss } on success, { trusted: false } on any failure.
 */
export async function verifyExchangeProof(jwe: string, proof: string): Promise<VerificationResult> {
  try {
    // Peek at the proof header and payload without verification
    const header = decodeProtectedHeader(proof);
    if (header.alg !== "ES256") {
      return { trusted: false };
    }

    const unverified = decodeJwt(proof);
    const iss = unverified.iss;
    if (!iss) return { trusted: false };

    // Build JWKS URL from the trust gateway
    const jwksUrl = new URL(`/${iss}/.well-known/jwks.json`, TRUST_GATEWAY_URL);
    const JWKS = createRemoteJWKSet(jwksUrl);

    // Verify the signature against the issuer's published keys
    const { payload } = await jwtVerify(proof, JWKS, {
      algorithms: ["ES256"],
    });

    // Confirm the proof is bound to this specific JWE payload
    const expectedSub = await sha256Base64url(jwe);
    if (payload.sub !== expectedSub) {
      return { trusted: false };
    }

    return { trusted: true, iss };
  } catch {
    // Any failure (network, bad signature, missing key) → untrusted
    return { trusted: false };
  }
}
