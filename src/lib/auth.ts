import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import { findUserByEmail, getUserRoles } from "@/lib/database";

const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  cookies: {
    sessionToken: {
      name: "agriopportunity.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await findUserByEmail(String(credentials.email));
        if (!user) {
          return null;
        }

        const validPassword = await compare(
          String(credentials.password),
          user.passwordHash,
        );

        if (!validPassword) {
          return null;
        }

        const roles = await getUserRoles(user.id);
        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          roles,
          organizationName: user.organizationName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.userId = (user as { id?: string }).id;
        token.roles = (user as { roles?: string[] }).roles ?? [(user as { role?: string }).role ?? "LEARNER"];
      }
      if (trigger === "update" && typeof session?.activeRole === "string") {
        const roles = await getUserRoles(String(token.userId));
        if (roles.some((role) => role === session.activeRole)) token.role = session.activeRole;
        token.roles = roles;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string | undefined;
        (session.user as { userId?: string }).userId = token.userId as string | undefined;
        (session.user as { roles?: string[] }).roles = token.roles as string[] | undefined;
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
