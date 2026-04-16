import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { mintRsvpToken } from "../../src/lib/tokens";

const prisma = new PrismaClient();

test("public RSVP happy path: accept with attendee count", async ({ page }) => {
  const invitee = await prisma.invitee.findFirst({
    where: { rsvpStatus: "PENDING", partySizeLimit: { gt: 1 } },
    include: { guest: true, event: true },
  });
  if (!invitee) test.skip(true, "Seed first: no PENDING invitee with partySizeLimit > 1.");

  const { token } = mintRsvpToken({ i: invitee!.id, v: invitee!.tokenVersion });

  await page.goto(`/r/${token}`);
  await expect(page.getByRole("heading", { name: invitee!.event.title })).toBeVisible();

  await page.getByRole("button", { name: /accept|سأحضر/i }).click();
  await page.getByRole("button", { name: /^confirm$|^تأكيد$/i }).click();

  await expect(page.getByText(/you're confirmed|تم تأكيد حضوركم/i)).toBeVisible();

  const updated = await prisma.invitee.findUnique({ where: { id: invitee!.id } });
  expect(updated?.rsvpStatus).toBe("ACCEPTED");
});

test("invalid token shows calm error page", async ({ page }) => {
  await page.goto("/r/invalid.token");
  await expect(page.getByText(/no longer valid|لم يعد|invitation link/i)).toBeVisible();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});
