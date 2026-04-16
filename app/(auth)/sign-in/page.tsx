import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignInForm } from "./SignInForm";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}): Promise<React.ReactElement> {
  const session = await auth();
  if (session?.user) redirect("/events");
  const { error, callbackUrl } = await searchParams;
  return (
    <div>
      <p className="text-micro text-text-subtle mb-2">Ministry of Media</p>
      <h1 className="text-h2 text-text mb-8">Sign in</h1>
      <SignInForm error={error} callbackUrl={callbackUrl} />
    </div>
  );
}
