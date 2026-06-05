import { createMiddleware } from "hono/factory";
import { jwtVerify } from "jose";
import { env } from "../env.js";
import type { SessionContext } from "../types/index.js";

export const requireSession = createMiddleware(async (c, next) => {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(auth.slice(7), secret);
    const session: SessionContext = {
      userId: payload.sub as string,
      email: payload.email as string,
    };
    c.set("session", session);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
});
