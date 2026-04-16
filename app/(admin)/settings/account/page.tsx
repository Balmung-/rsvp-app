import { requireUser } from "@/lib/auth";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function AccountPage(): Promise<React.ReactElement> {
  const user = await requireUser();
  return (
    <div className="max-w-md">
      <h1 className="text-h2 text-text mb-8">Account</h1>
      <dl className="flex flex-col gap-5 mb-10">
        <div className="flex items-baseline gap-6">
          <dt className="w-32 text-small text-text-subtle shrink-0">Name</dt>
          <dd className="text-body text-text">{user.name}</dd>
        </div>
        <div className="flex items-baseline gap-6">
          <dt className="w-32 text-small text-text-subtle shrink-0">Username</dt>
          <dd className="text-body text-text">{user.email}</dd>
        </div>
        <div className="flex items-baseline gap-6">
          <dt className="w-32 text-small text-text-subtle shrink-0">Role</dt>
          <dd className="text-body text-text">{user.role.toLowerCase()}</dd>
        </div>
      </dl>

      <h2 className="text-h3 text-text mb-4">Change password</h2>
      <ChangePasswordForm />
    </div>
  );
}
