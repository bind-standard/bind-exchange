import { PASSCODE_LENGTH, PBKDF2_ITERATIONS, PBKDF2_SALT_LENGTH } from "../constants.js";

/**
 * Hash a passcode using PBKDF2-SHA256.
 * Returns "salt:hash" where both are hex-encoded.
 */
export async function hashPasscode(passcode: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_LENGTH));
  const hash = await deriveKey(passcode, salt);
  return `${toHex(salt)}:${toHex(new Uint8Array(hash))}`;
}

/**
 * Verify a passcode against a stored "salt:hash" string.
 */
export async function verifyPasscode(passcode: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  const salt = fromHex(saltHex);
  const hash = await deriveKey(passcode, salt);
  const expected = fromHex(hashHex);
  const actual = new Uint8Array(hash);

  if (expected.length !== actual.length) return false;
  return crypto.subtle.timingSafeEqual(expected, actual);
}

/** Generate a random numeric passcode */
export function generatePasscode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(PASSCODE_LENGTH));
  return Array.from(bytes, (b) => (b % 10).toString()).join("");
}

async function deriveKey(passcode: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passcode),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
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
