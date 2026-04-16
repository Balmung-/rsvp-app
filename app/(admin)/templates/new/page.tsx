import { TemplateForm } from "../TemplateForm";

export default function NewTemplatePage(): React.ReactElement {
  return (
    <div className="max-w-3xl">
      <h1 className="text-h2 text-text mb-8">New template</h1>
      <TemplateForm
        mode="create"
        initial={{
          name: "",
          channel: "EMAIL",
          locale: "ar",
          subject: "",
          preheader: "",
          bodyMarkdown: "",
          smsBody: "",
          isDefault: false,
        }}
      />
    </div>
  );
}
