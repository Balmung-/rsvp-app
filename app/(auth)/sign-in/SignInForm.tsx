"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/ui/Button";
import { Input, Label } from "@/ui/Input";

function humanise(code: string | null | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case "Configuration":
      return "The server is not configured correctly. Check the server logs.";
    case "CredentialsSignin":
    case "CallbackRouteError":
      return "Invalid username or password.";
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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(humanise(initialError));

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      username,
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
      setError(humanise(res.error) ?? "Invalid username or password.");
      return;
    }
    window.location.href = res.url ?? callbackUrl ?? "/events";
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error ? <p role="alert" className="text-small text-danger">{error}</p> : null}
      <Button size="md" type="submit" loading={loading}>Sign in</Button>
    </form>
  );
}
