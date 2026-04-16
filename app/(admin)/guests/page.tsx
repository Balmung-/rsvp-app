import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { EmptyState } from "@/ui/EmptyState";

export default async function GuestsDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<React.ReactElement> {
  const user = await requireUser();
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const where = {
    organizationId: user.organizationId,
    ...(query
      ? {
          OR: [
            { fullName: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
            { phoneE164: { contains: query } },
          ],
        }
      : {}),
  };

  const guests = await prisma.guest.findMany({
    where,
    orderBy: { fullName: "asc" },
    take: 500,
    include: {
      _count: { select: { invitees: true } },
    },
  });

  return (
    <div>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-h2 text-text">Guests</h1>
          <p className="text-small text-text-muted mt-1">Organisation-wide directory. One entry per person, reused across events.</p>
        </div>
        <span className="text-small text-text-muted tabular-nums">{guests.length} total</span>
      </header>

      <form className="mb-4">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search by name, email, or phone…"
          className="w-full max-w-md h-10 px-3 rounded-md border border-border bg-surface text-body outline-none focus:border-border-strong focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        />
      </form>

      {guests.length === 0 ? (
        <EmptyState
          title="No guests match"
          description={query ? "Try a different query." : "Import guests from the Guests tab inside any event."}
        />
      ) : (
        <div className="border-t border-border">
          <table className="w-full text-body">
            <thead>
              <tr className="text-micro text-text-subtle text-start">
                <th className="py-3 ps-0 pe-4 font-medium">Name</th>
                <th className="py-3 px-4 font-medium">Email</th>
                <th className="py-3 px-4 font-medium">Phone</th>
                <th className="py-3 px-4 font-medium">Locale</th>
                <th className="py-3 px-4 font-medium text-end tabular-nums">Events</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((g) => (
                <tr key={g.id} className="border-t border-border hover:bg-surface-alt transition-colors duration-sm">
                  <td className="py-3 ps-0 pe-4 text-text">{g.fullName}</td>
                  <td className="py-3 px-4 text-text-muted">{g.email ?? "—"}</td>
                  <td className="py-3 px-4 text-text-muted tabular-nums">{g.phoneE164 ?? "—"}</td>
                  <td className="py-3 px-4 text-text-muted">{g.preferredLocale ?? "—"}</td>
                  <td className="py-3 px-4 text-end tabular-nums text-text-muted">{g._count.invitees}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
