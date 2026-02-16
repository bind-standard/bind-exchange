import { KV_PREFIX, R2_PREFIX } from "../constants.js";
import type { ExchangeMetadata } from "../types.js";

/** Store JWE payload in R2 */
export async function storePayload(bucket: R2Bucket, id: string, jwe: string): Promise<void> {
  await bucket.put(`${R2_PREFIX}/${id}/payload.jwe`, jwe);
}

/** Load JWE payload from R2 */
export async function loadPayload(bucket: R2Bucket, id: string): Promise<string | null> {
  const obj = await bucket.get(`${R2_PREFIX}/${id}/payload.jwe`);
  if (!obj) return null;
  return obj.text();
}

/** Delete JWE payload from R2 */
export async function deletePayload(bucket: R2Bucket, id: string): Promise<void> {
  await bucket.delete(`${R2_PREFIX}/${id}/payload.jwe`);
}

/** Store exchange metadata in KV with TTL */
export async function storeMetadata(
  kv: KVNamespace,
  id: string,
  metadata: ExchangeMetadata,
  ttlSeconds: number,
): Promise<void> {
  await kv.put(`${KV_PREFIX}:${id}`, JSON.stringify(metadata), {
    expirationTtl: ttlSeconds,
  });
}

/** Load exchange metadata from KV */
export async function loadMetadata(kv: KVNamespace, id: string): Promise<ExchangeMetadata | null> {
  const raw = await kv.get(`${KV_PREFIX}:${id}`);
  if (!raw) return null;
  return JSON.parse(raw) as ExchangeMetadata;
}

/** Update exchange metadata in KV (preserves remaining TTL via expiration timestamp) */
export async function updateMetadata(
  kv: KVNamespace,
  id: string,
  metadata: ExchangeMetadata,
): Promise<void> {
  const ttlSeconds = Math.max(1, Math.floor((metadata.exp - Date.now()) / 1000));
  await kv.put(`${KV_PREFIX}:${id}`, JSON.stringify(metadata), {
    expirationTtl: ttlSeconds,
  });
}

/** Delete exchange metadata from KV */
export async function deleteMetadata(kv: KVNamespace, id: string): Promise<void> {
  await kv.delete(`${KV_PREFIX}:${id}`);
}
