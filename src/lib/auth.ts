import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./db";
import { verifyPassword } from "./hash";
import { z } from "zod";

const CredentialsSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(6).max(200),
});

export const { auth, handlers, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/sign-in" },
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = CredentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
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

export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  return session.user as unknown as SessionUser;
}

export async function requireRole(allowed: Array<"OWNER" | "EDITOR" | "VIEWER">): Promise<SessionUser> {
  const user = await requireUser();
  if (!allowed.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}
