# BIND Exchange

Secure link-based sharing of encrypted [BIND Bundles](https://bind-standard.org/resources/Bundle) between insurance participants.

**Spec:** [bind-standard.org/exchange](https://bind-standard.org/exchange)

## What This Is

BIND Exchange lets insurance participants — brokers, carriers, MGAs, insureds — share bundles of BIND resources (submissions, quotes, policies, certificates) via a simple URL and passcode. No shared accounts, no portal logins, no proprietary integrations.

The protocol is adapted from [SMART Health Links](https://docs.smarthealthit.org/smart-health-links/spec/), which solved the same problem for sharing encrypted health data. The encryption key travels in the link, never on the server — the exchange server is a zero-knowledge intermediary.

## Hosted Exchange

A public instance of BIND Exchange is operated by **CloudRaker**. It can be used without permission by anyone, subject to the following:

- **Best-effort availability** — there is no SLA or uptime guarantee
- **Untrusted exchanges** (no proof JWT) are limited to 10KB payloads and 1-hour expiry
- **Trusted exchanges** (verified against the [BIND Trust Gateway](https://bind-pki.org)) get 5MB payloads and up to 1 year + 1 day expiry

You are free to self-host your own instance using this codebase.

## API

| Method | Path | Description |
|---|---|---|
| `POST` | `/exchange` | Create an exchange (upload encrypted payload) |
| `POST` | `/exchange/:id/manifest.json` | Retrieve manifest (verify passcode, get payload) |
| `GET` | `/health` | Health check |
| `GET` | `/api/spec` | OpenAPI specification |
| `GET` | `/` | Interactive API documentation (Scalar) |

### Examples

```bash
# Create an exchange (trusted, with proof)
curl -X POST https://exchange.bind-standard.org/exchange \
  -H "Content-Type: application/json" \
  -d '{"payload":"<JWE>","proof":"<proof-JWT>","label":"Acme GL Submission"}'

# Create an exchange (untrusted, no proof)
curl -X POST https://exchange.bind-standard.org/exchange \
  -H "Content-Type: application/json" \
  -d '{"payload":"<JWE>"}'

# Retrieve a manifest
curl -X POST https://exchange.bind-standard.org/exchange/<id>/manifest.json \
  -H "Content-Type: application/json" \
  -d '{"recipient":"Jane Doe, Marsh McLennan","passcode":"482910"}'
```

## Trust Tiers

| | Trusted | Untrusted |
|---|---------|-----------|
| **Proof** | Valid proof JWT verified against BIND Trust Gateway | No proof or verification failed |
| **Max payload** | 5 MB | 10 KB |
| **Default expiry** | 72 hours | 1 hour |
| **Max expiry** | 1 year + 1 day | 1 hour |

Untrusted exchanges are never rejected — they are accepted with restricted limits.

## Stack

- [Hono](https://hono.dev) + [Zod OpenAPI](https://github.com/honojs/middleware/tree/main/packages/zod-openapi) for the REST API
- [jose](https://github.com/panva/jose) for JWE/JWS/JWT handling
- [Cloudflare Workers](https://workers.cloudflare.com) + R2 + KV for hosting and storage
- [Scalar](https://scalar.com) for interactive API docs

## Development

```bash
pnpm install
pnpm run dev        # starts wrangler dev server on localhost:8787
```

The dev server uses local R2 and KV emulation — no Cloudflare account needed for development.

## Self-Hosting

Deploy your own instance to Cloudflare Workers:

1. Create an R2 bucket and KV namespace in your Cloudflare dashboard
2. Update the binding IDs in `wrangler.jsonc`
3. Run `pnpm run deploy`

## Contributing

We welcome contributions from everyone. See [CONTRIBUTING.md](CONTRIBUTING.md) for details, or open a pull request directly.

For questions or ideas, reach out at **contact@bind-standard.org**.

## License

This project is released under the [MIT License](LICENSE).

Copyright (c) 2026 CloudRaker.
