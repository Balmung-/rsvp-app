import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canAdvance } from "@/domain/messages/status";
import { verifyRsvpToken, tokenHashFromToken } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
): Promise<Response> {
  const { token } = await params;
  const url = new URL(req.url);
  const target = url.searchParams.get("u");
  const body = verifyRsvpToken(token);

  if (body) {
    try {
      const tokenHash = tokenHashFromToken(token);
      const invitee = await prisma.invitee.findFirst({
        where: { id: body.i, tokenHash, tokenVersion: body.v },
        select: { id: true, eventId: true },
      });
      if (invitee) {
        // Find the most recent outbound message for this invitee and advance it.
        const latest = await prisma.outboundMessage.findFirst({
          where: { inviteeId: invitee.id },
          orderBy: { createdAt: "desc" },
          select: { id: true, status: true },
        });
        if (latest && canAdvance(latest.status, "CLICKED")) {
          await prisma.outboundMessage.update({
            where: { id: latest.id },
            data: { status: "CLICKED", clickedAt: new Date() },
          });
        }
      }
    } catch {
      // Swallow — do not block the redirect on tracking failure.
    }
  }

  const safeTarget = isSafeInternalUrl(target) ? target! : `/r/${encodeURIComponent(token)}`;
  return NextResponse.redirect(new URL(safeTarget, url.origin), { status: 302 });
}

function isSafeInternalUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (!url.startsWith("/")) return false;
  if (url.startsWith("//")) return false;
  return true;
}
