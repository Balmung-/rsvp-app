"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/ui/Button";
import { Input, Label } from "@/ui/Input";

function humanise(code: string | null | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case "Configuration":
      return "The server is not configured correctly. AUTH_SECRET or trustHost may be missing on the host. Check the server logs.";
    case "CredentialsSignin":
    case "CallbackRouteError":
      return "Invalid email or password.";
    case "AccessDenied":
    case "Forbidden":
      return "Your account does not have access.";
    case "SessionRequired":
      return "Please sign in to continue.";
    default:
      return `Sign-in failed (${code}).`;
  }
}

export function SignInForm({
  error: initialError,
  callbackUrl,
}: {
  error?: string;
  callbackUrl?: string;
}): React.ReactElement {
  const [email, setEmail] = useState("owner@example.com");
  const [password, setPassword] = useState("demo-password");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(humanise(initialError));

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: callbackUrl ?? "/events",
    });
    setLoading(false);
    if (!res) {
      setError("Couldn't reach the server. Please try again.");
      return;
    }
    if (res.error) {
      setError(humanise(res.error) ?? "Invalid email or password.");
      return;
    }
    window.location.href = res.url ?? callbackUrl ?? "/events";
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error ? <p role="alert" className="text-small text-danger">{error}</p> : null}
      <Button size="md" type="submit" loading={loading}>Sign in</Button>
      <p className="text-small text-text-subtle mt-4">
        Demo: <span className="font-medium text-text-muted">owner@example.com</span> / <span className="font-medium text-text-muted">demo-password</span>
      </p>
    </form>
  );
}
