import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import exchange from "./routes/exchange.js";
import type { Bindings } from "./types.js";

const app = new OpenAPIHono<{ Bindings: Bindings }>();

app.use("*", cors());

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Mount exchange routes
app.route("/", exchange);

// OpenAPI spec
app.doc("/api/spec", {
  openapi: "3.1.0",
  info: {
    title: "BIND Exchange API",
    version: "0.1.0",
    description:
      "Secure link-based sharing of encrypted BIND Bundles between insurance participants.",
  },
});

// Scalar API docs
app.get("/", (c) => {
  return c.html(`<!doctype html>
<html>
  <head>
    <title>BIND Exchange API</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" data-url="/api/spec"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`);
});

export default app;
