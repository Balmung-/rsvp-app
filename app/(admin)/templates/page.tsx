import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export default async function TemplatesPage(): Promise<React.ReactElement> {
  const user = await requireUser();
  const templates = await prisma.template.findMany({
    where: { organizationId: user.organizationId },
    orderBy: [{ channel: "asc" }, { locale: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <h1 className="text-h2 text-text mb-8">Templates</h1>
      <div className="border-t border-border">
        <table className="w-full text-body">
          <thead>
            <tr className="text-micro text-text-subtle text-start">
              <th className="py-3 ps-0 pe-4 font-medium">Name</th>
              <th className="py-3 px-4 font-medium">Channel</th>
              <th className="py-3 px-4 font-medium">Locale</th>
              <th className="py-3 px-4 font-medium">Default</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} className="border-t border-border hover:bg-surface-alt transition-colors duration-sm">
                <td className="py-3 ps-0 pe-4 text-text">{t.name}</td>
                <td className="py-3 px-4 text-text-muted">{t.channel.toLowerCase()}</td>
                <td className="py-3 px-4 text-text-muted">{t.locale}</td>
                <td className="py-3 px-4 text-text-muted">{t.isDefault ? "yes" : ""}</td>
              </tr>
            ))}
            {templates.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-16 text-center text-text-muted">
                  No templates yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
