import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { SignOutButton } from "./SignOutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }): Promise<React.ReactElement> {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const user = session.user as { name: string; email: string };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 border-b border-border flex items-center px-6 gap-6">
        <div className="text-body font-medium text-text">Ministry of Media</div>
        <div className="flex-1" />
        <div className="text-small text-text-muted">{user.name}</div>
        <SignOutButton />
      </header>

      <div className="flex-1 flex">
        <aside className="w-60 shrink-0 border-e border-border px-3 py-6 hidden md:block">
          <nav className="flex flex-col gap-1">
            <NavLink href="/events">Events</NavLink>
            <NavLink href="/templates">Templates</NavLink>
            <NavLink href="/settings/brand">Settings</NavLink>
          </nav>
        </aside>
        <main className="flex-1 min-w-0 px-6 md:px-10 py-8 max-w-[1280px] mx-auto w-full">{children}</main>
      </div>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }): React.ReactElement {
  return (
    <Link
      href={href}
      className="h-9 px-3 rounded-md inline-flex items-center text-body text-text-muted hover:bg-surface-alt hover:text-text transition-colors duration-sm"
    >
      {children}
    </Link>
  );
}
