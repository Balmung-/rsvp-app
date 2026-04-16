import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { TemplateForm } from "../TemplateForm";

export default async function TemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const user = await requireUser();
  const { id } = await params;
  const template = await prisma.template.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!template) notFound();
  return (
    <div className="max-w-3xl">
      <h1 className="text-h2 text-text mb-8">Edit template</h1>
      <TemplateForm
        mode="edit"
        templateId={template.id}
        initial={{
          name: template.name,
          channel: template.channel,
          locale: template.locale === "en" ? "en" : "ar",
          subject: template.subject ?? "",
          preheader: template.preheader ?? "",
          bodyMarkdown: template.bodyMarkdown ?? "",
          smsBody: template.smsBody ?? "",
          isDefault: template.isDefault,
        }}
      />
    </div>
  );
}
