import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";

export default async function TemplatesPage(): Promise<React.ReactElement> {
  const user = await requireUser();
  const templates = await prisma.template.findMany({
    where: { organizationId: user.organizationId },
    orderBy: [{ channel: "asc" }, { locale: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-h2 text-text">Templates</h1>
        <Button asChild>
          <Link href="/templates/new">New template</Link>
        </Button>
      </header>

      {templates.length === 0 ? (
        <EmptyState
          title="No templates"
          description="Create a template for each channel + locale combination you need."
          action={<Button asChild><Link href="/templates/new">New template</Link></Button>}
        />
      ) : (
        <div className="border-t border-border">
          <table className="w-full text-body">
            <thead>
              <tr className="text-micro text-text-subtle text-start">
                <th className="py-3 ps-0 pe-4 font-medium">Name</th>
                <th className="py-3 px-4 font-medium">Channel</th>
                <th className="py-3 px-4 font-medium">Locale</th>
                <th className="py-3 px-4 font-medium">Default</th>
                <th className="py-3 px-4 font-medium" />
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-t border-border hover:bg-surface-alt transition-colors duration-sm">
                  <td className="py-3 ps-0 pe-4 text-text">
                    <Link href={`/templates/${t.id}`} className="hover:underline decoration-border-strong">
                      {t.name}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-text-muted">{t.channel.toLowerCase()}</td>
                  <td className="py-3 px-4 text-text-muted">{t.locale}</td>
                  <td className="py-3 px-4 text-text-muted">{t.isDefault ? "yes" : ""}</td>
                  <td className="py-3 px-4 text-end">
                    <Link
                      href={`/templates/${t.id}`}
                      className="text-small text-text-muted hover:text-text"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
