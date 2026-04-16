import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { verifyPassword } from "./hash";
import { z } from "zod";

const CredentialsSchema = z.object({
  username: z.string().trim().min(2).max(64),
  password: z.string().min(3).max(200),
});

export const { auth, handlers, signIn, signOut } = NextAuth({
  // trustHost is REQUIRED by Auth.js v5 in production when AUTH_URL isn't set.
  // Without it every POST to /api/auth/* fails host validation and the user
  // is bounced to /api/auth/error?error=Configuration (NextAuth's unbranded
  // dark error page).
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  // Route all auth UI (including errors) through our own /sign-in page
  // instead of NextAuth's built-in dark-themed error screen. The sign-in
  // page reads ?error= and renders it inline with our design.
  pages: { signIn: "/sign-in", error: "/sign-in" },
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = CredentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        // Username is stored in the `email` column (kept for schema
        // continuity). Lookup is case-insensitive.
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.username.toLowerCase() },
        });
        if (!user || !user.passwordHash) return null;
        const ok = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          locale: user.locale,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { id: string; role: string; organizationId: string; locale: string };
        token.uid = u.id;
        token.role = u.role;
        token.organizationId = u.organizationId;
        token.locale = u.locale;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.uid as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { organizationId?: string }).organizationId = token.organizationId as string;
        (session.user as { locale?: string }).locale = token.locale as string;
      }
      return session;
    },
  },
});

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
  organizationId: string;
  locale: string;
};

/**
 * For server components/pages: redirect unauthenticated users to /sign-in.
 * Do not use in API routes — use requireUserApi for those.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  return session.user as unknown as SessionUser;
}

export async function requireRole(
  allowed: Array<"OWNER" | "EDITOR" | "VIEWER">
): Promise<SessionUser> {
  const user = await requireUser();
  if (!allowed.includes(user.role)) redirect("/sign-in?error=Forbidden");
  return user;
}

/**
 * For API routes. Returns the user or null. Caller handles the response —
 * typically { status: 401 }.
 */
export async function getUserApi(): Promise<SessionUser | null> {
  const session = await auth();
  return (session?.user as unknown as SessionUser | undefined) ?? null;
}

export async function requireUserApi(): Promise<
  { ok: true; user: SessionUser } | { ok: false; status: 401 | 403; message: string }
> {
  const user = await getUserApi();
  if (!user) return { ok: false, status: 401, message: "UNAUTHENTICATED" };
  return { ok: true, user };
}

export async function requireRoleApi(
  allowed: Array<"OWNER" | "EDITOR" | "VIEWER">
): Promise<
  { ok: true; user: SessionUser } | { ok: false; status: 401 | 403; message: string }
> {
  const gate = await requireUserApi();
  if (!gate.ok) return gate;
  if (!allowed.includes(gate.user.role)) {
    return { ok: false, status: 403, message: "FORBIDDEN" };
  }
  return gate;
}
