function get(name: string, fallback?: string): string {
  const val = process.env[name] ?? fallback;
  if (val === undefined) throw new Error(`Missing required env var: ${name}`);
  return val;
}

export const env = {
  PORT: parseInt(process.env.PORT ?? "3001", 10),
  JWT_SECRET: get("JWT_SECRET", "dev-secret-change-in-production-min-32-chars!!"),
  DATABASE_URL: process.env.DATABASE_URL ?? "./gateml.db",
  // 64-char hex = 32 bytes = AES-256 key
  ENCRYPTION_KEY: get("ENCRYPTION_KEY", "0".repeat(64)),
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:5173",
} as const;
