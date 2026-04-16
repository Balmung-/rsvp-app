import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ComposeForm } from "./ComposeForm";

export default async function ComposePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<React.ReactElement> {
  const user = await requireUser();
  const { eventId } = await params;
  const [event, templates] = await Promise.all([
    prisma.event.findFirst({ where: { id: eventId, organizationId: user.organizationId } }),
    prisma.template.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ channel: "asc" }, { locale: "asc" }],
    }),
  ]);
  if (!event) return <div />;

  return (
    <ComposeForm
      eventId={event.id}
      templates={templates.map((t) => ({
        id: t.id,
        name: t.name,
        channel: t.channel,
        locale: t.locale,
      }))}
    />
  );
}
