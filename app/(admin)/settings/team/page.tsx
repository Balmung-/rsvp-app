import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export default async function TeamSettingsPage(): Promise<React.ReactElement> {
  const user = await requireUser();
  const users = await prisma.user.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
  });
  return (
    <div>
      <h1 className="text-h2 text-text mb-8">Team</h1>
      <div className="border-t border-border">
        <table className="w-full text-body">
          <thead>
            <tr className="text-micro text-text-subtle text-start">
              <th className="py-3 ps-0 pe-4 font-medium">Name</th>
              <th className="py-3 px-4 font-medium">Email</th>
              <th className="py-3 px-4 font-medium">Role</th>
              <th className="py-3 px-4 font-medium">Locale</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="py-3 ps-0 pe-4 text-text">{u.name}</td>
                <td className="py-3 px-4 text-text-muted">{u.email}</td>
                <td className="py-3 px-4 text-text-muted">{u.role.toLowerCase()}</td>
                <td className="py-3 px-4 text-text-muted">{u.locale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
