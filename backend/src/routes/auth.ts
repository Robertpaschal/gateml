import { Hono } from "hono";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { getDb } from "../db/connection.js";
import { newId, createApiKey } from "../services/keyManager.js";
import { env } from "../env.js";

export const auth = new Hono();

auth.post("/signup", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password || password.length < 8) {
    return c.json({ error: "Valid email and password (min 8 chars) required" }, 400);
  }

  const db = getDb();
  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
    return c.json({ error: "Email already registered" }, 409);
  }

  const id = newId();
  const hash = await bcrypt.hash(password, 12);
  db.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)").run(id, email, hash);

  // Provision one test key and one live key immediately
  const testKey = createApiKey(id, "Default", "test");
  const liveKey = createApiKey(id, "Default", "live");

  // Default routing: gpt-4o → claude-sonnet-4-6 → gpt-4o-mini
  db.prepare(
    "INSERT INTO routing_configs (id, user_id, primary_model, fallback_chain) VALUES (?, ?, ?, ?)"
  ).run(newId(), id, "gpt-4o", JSON.stringify([
    { model: "claude-sonnet-4-6", on: [429, 500, 502, 503] },
    { model: "gpt-4o-mini", on: [429, 500, 502, 503] },
  ]));

  const token = await mintJwt(id, email);
  return c.json({ token, testKey: testKey.key, liveKey: liveKey.key }, 201);
});

auth.post("/login", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  if (!email || !password) return c.json({ error: "Email and password required" }, 400);

  const db = getDb();
  const user = db
    .prepare("SELECT id, password_hash FROM users WHERE email = ?")
    .get(email) as { id: string; password_hash: string } | undefined;

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = await mintJwt(user.id, email);
  return c.json({ token });
});

auth.get("/me", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { jwtVerify } = await import("jose");
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(authHeader.slice(7), secret);
    return c.json({ userId: payload.sub, email: payload.email });
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});

async function mintJwt(userId: string, email: string): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}
