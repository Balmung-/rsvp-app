import { describe, expect, it, beforeAll } from "vitest";

beforeAll(() => {
  process.env.TOKEN_SIGNING_SECRET = "test-secret-that-is-long-enough-for-hmac";
});

describe("rsvp tokens", () => {
  it("round-trips payload and produces a matching hash", async () => {
    const { mintRsvpToken, verifyRsvpToken, tokenHashFromToken } = await import("../../src/lib/tokens");
    const body = { i: "invitee_abc123", v: 1 };
    const { token, tokenHash } = mintRsvpToken(body);
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    const verified = verifyRsvpToken(token);
    expect(verified).toEqual(body);
    expect(tokenHashFromToken(token)).toBe(tokenHash);
  });

  it("rejects a tampered signature", async () => {
    const { mintRsvpToken, verifyRsvpToken } = await import("../../src/lib/tokens");
    const { token } = mintRsvpToken({ i: "x", v: 1 });
    const parts = token.split(".");
    const tampered = `${parts[0]}.${"a".repeat(parts[1]!.length)}`;
    expect(verifyRsvpToken(tampered)).toBeNull();
  });

  it("rejects garbage input", async () => {
    const { verifyRsvpToken } = await import("../../src/lib/tokens");
    expect(verifyRsvpToken("")).toBeNull();
    expect(verifyRsvpToken("no-dot")).toBeNull();
    expect(verifyRsvpToken("a.b")).toBeNull();
  });
});
