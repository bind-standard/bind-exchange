import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  DEFAULT_EXPIRY_SECONDS,
  MAX_ATTEMPTS,
  MAX_EXPIRY_SECONDS,
  MAX_PAYLOAD_SIZE,
  UNTRUSTED_EXPIRY_SECONDS,
  UNTRUSTED_MAX_PAYLOAD_SIZE,
} from "../constants.js";
import { generateExchangeId, validateJweHeader } from "../lib/crypto.js";
import { hashPasscode, verifyPasscode } from "../lib/passcode.js";
import {
  deleteMetadata,
  deletePayload,
  loadMetadata,
  loadPayload,
  storeMetadata,
  storePayload,
  updateMetadata,
} from "../lib/storage.js";
import { verifyExchangeProof } from "../lib/verify.js";
import type { Bindings } from "../types.js";

const exchange = new OpenAPIHono<{ Bindings: Bindings }>();

// --- Schemas ---

const CreateRequestSchema = z.object({
  payload: z.string().min(1).openapi({
    description: "JWE compact serialization of the encrypted BIND Bundle",
    example: "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIiwiY3R5IjoiYXBwbGljYXRpb24vYmluZCtqc29uIn0...",
  }),
  passcode: z.string().min(4).max(16).optional().openapi({
    description: "Passcode for accessing the exchange. If omitted, no passcode is required.",
  }),
  label: z.string().max(100).optional().openapi({
    description: "Human-readable label for the exchange",
    example: "Acme Corp GL Policy Package",
  }),
  exp: z.number().int().positive().optional().openapi({
    description:
      "Expiry time in seconds from now (default 72h, max 1 year for trusted; capped to 1h for untrusted)",
    example: 259200,
  }),
  proof: z.string().optional().openapi({
    description:
      "Proof JWT (ES256) binding the sender's signing key to this JWE payload. Required for trusted-tier limits.",
  }),
});

const CreateResponseSchema = z.object({
  url: z.string().openapi({ description: "URL for retrieving the exchange manifest" }),
  exp: z.number().openapi({ description: "Expiry timestamp (ms since epoch)" }),
  flag: z.string().openapi({ description: "Access flags (P = passcode required)" }),
  passcode: z.string().optional().openapi({
    description: "Generated passcode (only present if none was provided in the request)",
  }),
  trusted: z
    .boolean()
    .openapi({ description: "Whether the exchange was verified against the BIND Trust Gateway" }),
  iss: z
    .string()
    .optional()
    .openapi({ description: "Verified issuer identifier (only present if trusted)" }),
});

const RetrieveRequestSchema = z.object({
  recipient: z.string().min(1).max(200).openapi({
    description: "Name or identifier of the recipient",
    example: "Jane Doe, Marsh McLennan",
  }),
  passcode: z.string().min(1).optional().openapi({
    description: "Passcode for accessing the exchange (required only if the exchange is passcode-protected)",
  }),
});

const ManifestFileSchema = z.object({
  contentType: z.string(),
  embedded: z.string(),
});

const ManifestResponseSchema = z.object({
  files: z.array(ManifestFileSchema),
});

const ErrorSchema = z.object({
  error: z.string(),
  remainingAttempts: z.number().optional(),
  authRequired: z.boolean().optional(),
});

// --- Routes ---

const createExchangeRoute = createRoute({
  method: "post",
  path: "/exchange",
  summary: "Create an exchange",
  description:
    "Store an encrypted BIND Bundle payload, returning a URL for retrieval. " +
    "Exchanges with a valid proof JWT are trusted (72h expiry, 5MB limit). " +
    "Exchanges without proof are untrusted (1h expiry, 10KB limit).",
  request: {
    body: {
      content: {
        "application/json": { schema: CreateRequestSchema },
      },
    },
  },
  responses: {
    201: {
      description: "Exchange created successfully",
      content: { "application/json": { schema: CreateResponseSchema } },
    },
    400: {
      description: "Invalid request (bad JWE header, payload too large, etc.)",
      content: { "application/json": { schema: ErrorSchema } },
    },
    413: {
      description: "Payload too large for trust tier",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

exchange.openapi(createExchangeRoute, async (c) => {
  const body = c.req.valid("json");

  // Validate JWE header
  try {
    await validateJweHeader(body.payload);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }

  // Verify trust via proof JWT
  let trusted = false;
  let iss: string | undefined;

  if (body.proof) {
    const result = await verifyExchangeProof(body.payload, body.proof);
    trusted = result.trusted;
    iss = result.iss;
  }

  // Apply tier limits
  const maxPayload = trusted ? MAX_PAYLOAD_SIZE : UNTRUSTED_MAX_PAYLOAD_SIZE;
  if (body.payload.length > maxPayload) {
    const tier = trusted ? "trusted" : "untrusted";
    const limitKb = Math.round(maxPayload / 1024);
    return c.json(
      {
        error: `Payload too large for ${tier} tier (max ${limitKb >= 1024 ? `${limitKb / 1024}MB` : `${limitKb}KB`})`,
      },
      413,
    );
  }

  const maxExpiry = trusted ? MAX_EXPIRY_SECONDS : UNTRUSTED_EXPIRY_SECONDS;
  const defaultExpiry = trusted ? DEFAULT_EXPIRY_SECONDS : UNTRUSTED_EXPIRY_SECONDS;
  const expSeconds = Math.min(body.exp ?? defaultExpiry, maxExpiry);
  const expTimestamp = Date.now() + expSeconds * 1000;

  // Passcode: only hash if provided
  const passcodeHash = body.passcode ? await hashPasscode(body.passcode) : undefined;

  // Generate ID and store
  const id = generateExchangeId();

  await Promise.all([
    storePayload(c.env.EXCHANGE_BUCKET, id, body.payload),
    storeMetadata(
      c.env.EXCHANGE_KV,
      id,
      {
        ...(passcodeHash ? { passcodeHash } : {}),
        exp: expTimestamp,
        attempts: 0,
        label: body.label,
        createdAt: Date.now(),
        trusted,
        iss,
      },
      expSeconds,
    ),
  ]);

  const url = new URL(`/exchange/${id}/manifest.json`, c.req.url).toString();

  return c.json(
    {
      url,
      exp: expTimestamp,
      flag: passcodeHash ? "P" : "",
      trusted,
      ...(iss ? { iss } : {}),
    },
    201,
  );
});

const retrieveManifestRoute = createRoute({
  method: "post",
  path: "/exchange/{id}/manifest.json",
  summary: "Retrieve an exchange manifest",
  description: "Verify passcode and retrieve the encrypted BIND Bundle payload.",
  request: {
    params: z.object({
      id: z.string().min(1).openapi({ description: "Exchange ID", example: "abc123..." }),
    }),
    body: {
      content: {
        "application/json": { schema: RetrieveRequestSchema },
      },
    },
  },
  responses: {
    200: {
      description: "Manifest with embedded encrypted payload",
      content: { "application/json": { schema: ManifestResponseSchema } },
    },
    401: {
      description: "Invalid passcode",
      content: { "application/json": { schema: ErrorSchema } },
    },
    404: {
      description: "Exchange not found or expired",
      content: { "application/json": { schema: ErrorSchema } },
    },
    429: {
      description: "Too many failed attempts",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

exchange.openapi(retrieveManifestRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { recipient: _recipient, passcode } = c.req.valid("json");

  // Load metadata
  const metadata = await loadMetadata(c.env.EXCHANGE_KV, id);
  if (!metadata) {
    return c.json({ error: "Exchange not found or expired" }, 404);
  }

  // Check expiration
  if (Date.now() > metadata.exp) {
    await Promise.all([
      deleteMetadata(c.env.EXCHANGE_KV, id),
      deletePayload(c.env.EXCHANGE_BUCKET, id),
    ]);
    return c.json({ error: "Exchange has expired" }, 404);
  }

  // Check attempt limit
  if (metadata.attempts >= MAX_ATTEMPTS) {
    await Promise.all([
      deleteMetadata(c.env.EXCHANGE_KV, id),
      deletePayload(c.env.EXCHANGE_BUCKET, id),
    ]);
    return c.json(
      { error: "Too many failed attempts. Exchange has been locked.", remainingAttempts: 0 },
      429,
    );
  }

  // Verify passcode (if exchange is passcode-protected)
  if (metadata.passcodeHash) {
    if (!passcode) {
      // Exchange requires a passcode but none was provided — do not count as attempt
      return c.json({ error: "Passcode required", authRequired: true }, 401);
    }

    const valid = await verifyPasscode(passcode, metadata.passcodeHash);
    if (!valid) {
      metadata.attempts += 1;
      const remaining = MAX_ATTEMPTS - metadata.attempts;
      await updateMetadata(c.env.EXCHANGE_KV, id, metadata);

      if (remaining <= 0) {
        await deletePayload(c.env.EXCHANGE_BUCKET, id);
      }

      return c.json({ error: "Invalid passcode", remainingAttempts: remaining }, 401);
    }
  }

  // Load payload
  const jwe = await loadPayload(c.env.EXCHANGE_BUCKET, id);
  if (!jwe) {
    return c.json({ error: "Payload not found" }, 404);
  }

  return c.json(
    {
      files: [
        {
          contentType: "application/bind+json",
          embedded: jwe,
        },
      ],
    },
    200,
  );
});

export default exchange;
