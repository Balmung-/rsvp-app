import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dedupeKey } from "@/lib/hash";
import { log } from "@/lib/logger";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";
import { registry } from "@/providers/registry";
import { getBoss, QUEUES } from "@/queue/boss";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
): Promise<NextResponse> {
  const { provider } = await params;
  const rl = await rateLimit({
    key: `wh:email:${provider}:${ipFromRequest(req)}`,
    capacity: 120,
    refillPerSecond: 10,
  });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });
  }

  let adapter;
  try {
    adapter = registry.email(provider);
  } catch {
    return NextResponse.json({ ok: false, error: "UNKNOWN_PROVIDER" }, { status: 404 });
  }

  const cloned = req.clone();
  const verified = await adapter.verifyWebhook(cloned);
  if (!verified) {
    return NextResponse.json({ ok: false, error: "BAD_SIGNATURE" }, { status: 401 });
  }

  const events = await adapter.parseWebhook(req);
  const now = new Date();

  for (const event of events) {
    const key = dedupeKey(["email", provider, event.externalMessageId, event.status, event.occurredAt]);
    const receipt = await prisma.webhookReceipt.upsert({
      where: { dedupeKey: key },
      create: {
        provider,
        channel: "EMAIL",
        signatureVerified: true,
        dedupeKey: key,
        payloadJson: [event] as never,
        receivedAt: now,
      },
      update: {},
    });
    if (!receipt.processedAt) {
      const boss = await getBoss();
      await boss.send(QUEUES.ingestWebhook, { webhookReceiptId: receipt.id });
    }
  }
  log.info("webhook.email.accepted", { provider, count: events.length });
  return NextResponse.json({ ok: true });
}
