"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/ui/Button";
import { Input, Label } from "@/ui/Input";

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
  const [error, setError] = useState<string | null>(initialError ?? null);

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
    if (!res || res.error) {
      setError("Invalid email or password.");
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
