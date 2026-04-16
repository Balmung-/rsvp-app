import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Filter = "all" | "accepted" | "declined" | "pending";

function csvEscape(v: string | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
): Promise<Response> {
  const user = await requireUser();
  const { eventId } = await params;
  const url = new URL(req.url);
  const filter = (url.searchParams.get("filter") ?? "all") as Filter;

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: user.organizationId },
  });
  if (!event) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  const invitees = await prisma.invitee.findMany({
    where: {
      eventId,
      ...(filter === "accepted" ? { rsvpStatus: "ACCEPTED" } : {}),
      ...(filter === "declined" ? { rsvpStatus: "DECLINED" } : {}),
      ...(filter === "pending" ? { rsvpStatus: "PENDING" } : {}),
    },
    include: {
      guest: true,
      rsvpResponses: { orderBy: { submittedAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });

  const header = [
    "name",
    "email",
    "phone",
    "locale",
    "rsvp",
    "attendee_count",
    "note",
    "party_size_limit",
    "plus_one",
    "tags",
    "responded_at",
  ];
  const rows = invitees.map((i) => [
    i.guest.fullName,
    i.guest.email ?? "",
    i.guest.phoneE164 ?? "",
    i.guest.preferredLocale ?? "",
    i.rsvpStatus,
    i.rsvpResponses[0]?.attendeeCount?.toString() ?? "",
    i.rsvpResponses[0]?.note ?? "",
    i.partySizeLimit.toString(),
    i.allowPlusOne ? "yes" : "no",
    Array.isArray(i.tagsJson) ? (i.tagsJson as unknown[]).join(", ") : "",
    i.respondedAt?.toISOString() ?? "",
  ]);

  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n");
  const slug = event.slug.replace(/[^a-z0-9-]/gi, "-");
  const filename = `${slug}-${filter}.csv`;

  return new NextResponse("\ufeff" + csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
