import { describe, expect, it } from "vitest";
import { canAdvance } from "../../src/domain/messages/status";

describe("message status machine", () => {
  it("advances forward through the happy path", () => {
    expect(canAdvance("DRAFT", "QUEUED")).toBe(true);
    expect(canAdvance("QUEUED", "ACCEPTED")).toBe(true);
    expect(canAdvance("ACCEPTED", "SENT")).toBe(true);
    expect(canAdvance("SENT", "DELIVERED")).toBe(true);
    expect(canAdvance("DELIVERED", "OPENED")).toBe(true);
    expect(canAdvance("OPENED", "CLICKED")).toBe(true);
  });

  it("ignores regressions", () => {
    expect(canAdvance("DELIVERED", "SENT")).toBe(false);
    expect(canAdvance("CLICKED", "OPENED")).toBe(false);
    expect(canAdvance("OPENED", "DELIVERED")).toBe(false);
  });

  it("ignores bounce after delivery (test 6 from spec)", () => {
    expect(canAdvance("DELIVERED", "BOUNCED")).toBe(false);
    expect(canAdvance("OPENED", "BOUNCED")).toBe(false);
  });

  it("allows bounce from ACCEPTED or SENT", () => {
    expect(canAdvance("ACCEPTED", "BOUNCED")).toBe(true);
    expect(canAdvance("SENT", "BOUNCED")).toBe(true);
  });

  it("ignores failed after send", () => {
    expect(canAdvance("SENT", "FAILED")).toBe(false);
    expect(canAdvance("DELIVERED", "FAILED")).toBe(false);
  });
});
