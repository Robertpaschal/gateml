import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { env } from "../env.js";

const ALGO = "aes-256-gcm";

export function encryptKey(plaintext: string): string {
  const iv = randomBytes(12);
  const keyBuf = Buffer.from(env.ENCRYPTION_KEY, "hex");
  const cipher = createCipheriv(ALGO, keyBuf, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptKey(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const keyBuf = Buffer.from(env.ENCRYPTION_KEY, "hex");
  const decipher = createDecipheriv(ALGO, keyBuf, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
}
