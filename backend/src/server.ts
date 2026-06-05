import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { migrate } from "./db/schema.js";
import { env } from "./env.js";
import { auth } from "./routes/auth.js";
import { keys } from "./routes/keys.js";
import { providerKeys } from "./routes/providerKeys.js";
import { routing } from "./routes/routing.js";
import { gateway } from "./routes/gateway.js";
import { logs } from "./routes/logs.js";
import { stats } from "./routes/stats.js";

// Run schema migrations on startup
migrate();

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: env.FRONTEND_URL,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Dashboard API
app.route("/auth", auth);
app.route("/keys", keys);
app.route("/provider-keys", providerKeys);
app.route("/routing", routing);
app.route("/logs", logs);
app.route("/stats", stats);

// OpenAI-compatible gateway  → /v1/chat/completions, /v1/models
app.route("/v1", gateway);

app.get("/health", c => c.json({ ok: true, version: "0.1.0" }));

serve({ fetch: app.fetch, port: env.PORT }, info => {
  console.log(`GateML API →  http://localhost:${info.port}`);
  console.log(`Gateway   →  http://localhost:${info.port}/v1/chat/completions`);
});
