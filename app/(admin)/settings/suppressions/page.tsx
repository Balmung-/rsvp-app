import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { SuppressionList } from "./SuppressionList";

export default async function SuppressionsPage(): Promise<React.ReactElement> {
  const user = await requireUser();
  const items = await prisma.suppression.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return (
    <div className="max-w-3xl">
      <h1 className="text-h2 text-text mb-2">Suppressions</h1>
      <p className="text-body text-text-muted mb-8">
        Email addresses and phone numbers that will be skipped on every send. Includes self-unsubscribes from public links and provider bounces.
      </p>
      <SuppressionList
        canEdit={user.role === "OWNER" || user.role === "EDITOR"}
        initial={items.map((i) => ({
          id: i.id,
          channel: i.channel,
          value: i.value,
          reason: i.reason,
          source: i.source,
          createdAt: i.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
