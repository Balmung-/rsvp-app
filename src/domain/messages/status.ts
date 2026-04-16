import type { MessageStatus } from "@prisma/client";

/**
 * Monotonic status machine. An update is accepted iff its rank is strictly
 * greater than the current rank. Terminal branches (FAILED/BOUNCED/COMPLAINED)
 * sit at ranks that only allow them to override states *before* the positive
 * outcome they contradict:
 *   FAILED (25)    — allowed from DRAFT/QUEUED/ACCEPTED, ignored from SENT onward
 *   BOUNCED (35)   — allowed from ACCEPTED/SENT, ignored from DELIVERED onward
 *   COMPLAINED (45)— allowed from DELIVERED, ignored from OPENED onward
 */
const RANK: Record<MessageStatus, number> = {
  DRAFT: 0,
  QUEUED: 10,
  ACCEPTED: 20,
  FAILED: 25,
  SENT: 30,
  BOUNCED: 35,
  DELIVERED: 40,
  COMPLAINED: 45,
  OPENED: 50,
  CLICKED: 60,
};

export function canAdvance(from: MessageStatus, to: MessageStatus): boolean {
  return RANK[to] > RANK[from];
}

export function pickNextStatus(from: MessageStatus, to: MessageStatus): MessageStatus {
  return canAdvance(from, to) ? to : from;
}
