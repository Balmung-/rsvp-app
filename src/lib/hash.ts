import crypto from "node:crypto";
import bcrypt from "bcryptjs";

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, 12);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

export function hashIp(ip: string): string {
  const secret = process.env.TOKEN_SIGNING_SECRET ?? "dev-ip-hash-salt";
  return crypto.createHmac("sha256", secret).update(ip).digest("hex");
}

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function dedupeKey(parts: (string | number)[]): string {
  return sha256(parts.map(String).join("|"));
}
