import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { PASSCODE_LENGTH, PBKDF2_ITERATIONS, PBKDF2_SALT_LENGTH } from "../constants.js";

/**
 * Hash a passcode using PBKDF2-SHA256.
 * Returns "salt:hash" where both are hex-encoded.
 */
export async function hashPasscode(passcode: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_LENGTH));
  const hash = deriveKey(passcode, salt);
  return `${toHex(salt)}:${toHex(hash)}`;
}

/**
 * Verify a passcode against a stored "salt:hash" string.
 */
export async function verifyPasscode(passcode: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  const salt = fromHex(saltHex);
  const hash = deriveKey(passcode, salt);
  const expected = fromHex(hashHex);

  if (expected.length !== hash.length) return false;
  return crypto.subtle.timingSafeEqual(expected, hash);
}

/** Generate a random numeric passcode */
export function generatePasscode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(PASSCODE_LENGTH));
  return Array.from(bytes, (b) => (b % 10).toString()).join("");
}

function deriveKey(passcode: string, salt: Uint8Array): Uint8Array {
  return pbkdf2(sha256, passcode, salt, { c: PBKDF2_ITERATIONS, dkLen: 32 });
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
