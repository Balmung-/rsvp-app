import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canAdvance } from "@/domain/messages/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  try {
    const msg = await prisma.outboundMessage.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (msg && canAdvance(msg.status, "OPENED")) {
      await prisma.outboundMessage.update({
        where: { id: msg.id },
        data: { status: "OPENED", openedAt: new Date() },
      });
    }
  } catch {
    // Silently swallow — tracking must not break the email render.
  }
  return new NextResponse(GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(GIF.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
  });
}
