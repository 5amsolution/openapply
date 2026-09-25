import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { serverEnv } from "@/lib/env";

// AES-256-GCM for users' AI API keys at rest. Format: v1.<iv>.<tag>.<ciphertext> (base64url).

function key(): Buffer {
  // Accept any string; derive a fixed 32-byte key from it.
  return createHash("sha256").update(serverEnv.encryptionKey()).digest();
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), data.toString("base64url")].join(".");
}

export function decrypt(payload: string): string {
  const [version, iv, tag, data] = payload.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Unrecognized encrypted payload");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** "sk-ant-api03-abcd…wxyz" style hint shown in the UI instead of the key. */
export function keyHint(apiKey: string): string {
  const k = apiKey.trim();
  if (k.length <= 8) return "••••";
  return `${k.slice(0, 6)}…${k.slice(-4)}`;
}
