# Contributing to BIND Exchange

We welcome contributions from everyone in the insurance ecosystem — brokers, carriers, MGAs, TPAs, reinsurers, vendors, and developers.

## How to Contribute

1. **Fork** this repository
2. **Create a branch** for your change
3. **Make your changes** and commit them
4. **Open a pull request** against `main`

That's it. All contributions are reviewed before merging.

## What to Contribute

- **Bug fixes** — Something not working as the spec describes? Fix it.
- **Security improvements** — Better cryptographic practices, hardening, vulnerability fixes.
- **API enhancements** — New capabilities that align with the protocol spec.
- **Documentation** — Improve the README, add examples, clarify behavior.
- **Testing** — Add test coverage for edge cases and failure modes.

## Guidelines

- Keep PRs focused. One logical change per pull request.
- Include a clear description of *why* the change is needed, not just *what* changed.
- Follow existing patterns in the codebase (Zod OpenAPI route definitions, storage abstraction, etc.).
- Security-sensitive changes (crypto, passcode handling, trust verification) require extra review.
- If proposing a significant change, open an issue first to discuss the approach.

## Code Quality

Before opening a PR, run:

```bash
pnpm run check         # lint + format (Biome)
pnpm run typecheck     # TypeScript type checking
```

To auto-fix lint and formatting issues:

```bash
pnpm run check:fix     # auto-fix all issues
```

## Development

```bash
pnpm install
pnpm run dev        # starts wrangler dev server on localhost:8787
```

The dev server uses local R2 and KV emulation — no Cloudflare account needed for development.

## Questions or Ideas?

If you want to discuss something before opening a PR, reach out at **contact@bind-standard.org**.

## License

By contributing to this project, you agree that your contributions will be released under the [MIT License](LICENSE).
