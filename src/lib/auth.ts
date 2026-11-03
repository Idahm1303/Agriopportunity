import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import { findUserByEmail, findUserById, getUserRoles } from "@/lib/database";
import { clearFailedLogins, getPlatformSettings, isLoginLocked, recordFailedLogin } from "@/lib/platform-settings";

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

        const email = String(credentials.email).trim().toLowerCase();
        const settings = await getPlatformSettings();
        if (await isLoginLocked(email)) return null;

        const user = await findUserByEmail(email);
        if (!user || user.accountStatus !== "active") {
          if (!user) await recordFailedLogin(email, settings);
          return null;
        }

        const validPassword = await compare(
          String(credentials.password),
          user.passwordHash,
        );

        if (!validPassword) {
          await recordFailedLogin(email, settings);
          return null;
        }

        await clearFailedLogins(email);
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
      if (typeof token.userId === "string") {
        const currentUser = await findUserById(token.userId);
        if (!currentUser || currentUser.accountStatus !== "active") {
          token.userId = undefined;
          token.role = undefined;
          token.roles = [];
          token.accountStatus = currentUser?.accountStatus ?? "deleted";
        } else {
          const roles = await getUserRoles(token.userId);
          token.roles = roles;
          if (!roles.some((role) => role === token.role)) token.role = currentUser.role;
          if (roles.includes("ADMIN")) {
            token.role = "ADMIN";
          } else if (trigger === "update" && typeof session?.activeRole === "string") {
            const activeRole = roles.find((role) => role === session.activeRole);
            if (activeRole) token.role = activeRole;
          }
          token.accountStatus = currentUser.accountStatus;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.accountStatus !== "active") {
        session.user = undefined;
      } else if (session.user) {
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
