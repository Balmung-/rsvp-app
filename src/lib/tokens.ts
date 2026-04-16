import crypto from "node:crypto";

function getSecret(): string {
  const s = process.env.TOKEN_SIGNING_SECRET;
  if (!s || s.length < 16) {
    throw new Error("TOKEN_SIGNING_SECRET is missing or too short");
  }
  return s;
}

const b64u = (buf: Buffer): string =>
  buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const b64uDecode = (s: string): Buffer =>
  Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

export interface TokenBody {
  i: string; // inviteeId
  v: number; // tokenVersion
}

export interface MintedToken {
  token: string;
  tokenHash: string;
}

export function mintRsvpToken(body: TokenBody): MintedToken {
  const payload = b64u(Buffer.from(JSON.stringify(body)));
  const sig = b64u(
    crypto.createHmac("sha256", getSecret()).update(payload).digest()
  ).slice(0, 22);
  const token = `${payload}.${sig}`;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function verifyRsvpToken(token: string): TokenBody | null {
  if (typeof token !== "string" || token.length > 512) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts as [string, string];
  if (!payload || !sig) return null;
  const expected = b64u(
    crypto.createHmac("sha256", getSecret()).update(payload).digest()
  ).slice(0, 22);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(b64uDecode(payload).toString("utf8")) as unknown;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as TokenBody).i !== "string" ||
      typeof (parsed as TokenBody).v !== "number"
    ) {
      return null;
    }
    return parsed as TokenBody;
  } catch {
    return null;
  }
}

export function tokenHashFromToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
