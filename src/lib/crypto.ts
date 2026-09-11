import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;

export function getEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_SECRET;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_SECRET is not set. Generate with: openssl rand -base64 32"
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_SECRET must decode to 32 bytes (base64 of 32 random bytes).");
  }
  return key;
}

export function encryptApiKey(plain: string): string {
  if (!plain || plain.length < 1 || plain.length > 500) {
    throw new Error("API key must be 1..500 characters.");
  }
  const key = getEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptApiKey(payload: string): string {
  try {
    const parts = payload.split(":");
    if (parts.length !== 3) throw new Error("bad format");
    const [ivHex, tagHex, dataHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const data = Buffer.from(dataHex, "hex");
    if (iv.length !== IV_BYTES || tag.length !== 16 || data.length === 0) {
      throw new Error("bad parts");
    }
    const decipher = createDecipheriv(ALGO, getEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Failed to decrypt API key. Please save it again.");
  }
}
