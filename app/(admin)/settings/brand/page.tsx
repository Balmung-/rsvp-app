import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { BrandForm } from "./BrandForm";

export default async function BrandSettingsPage(): Promise<React.ReactElement> {
  const user = await requireUser();
  const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });
  if (!org) return <div />;
  return (
    <div className="max-w-xl">
      <h1 className="text-h2 text-text mb-8">Brand</h1>
      <BrandForm
        canEdit={user.role === "OWNER"}
        initial={{
          name: org.name,
          defaultLocale: org.defaultLocale === "en" ? "en" : "ar",
          defaultTimezone: org.defaultTimezone,
          brandAccent: org.brandAccent,
          logoUrl: org.logoUrl ?? "",
          supportEmail: org.supportEmail ?? "",
          supportPhone: org.supportPhone ?? "",
        }}
      />
    </div>
  );
}
