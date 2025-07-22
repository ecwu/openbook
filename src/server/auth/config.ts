import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { and, eq } from "drizzle-orm";
import type { DefaultSession, NextAuthConfig } from "next-auth";
import AuthentikProvider from "next-auth/providers/authentik";

import { db } from "@/server/db";
import {
	accounts,
	groups,
	sessions,
	userGroups,
	users,
	verificationTokens,
} from "@/server/db/schema";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
	interface Session extends DefaultSession {
		user: {
			id: string;
			role: string;
		} & DefaultSession["user"];
	}

	interface User {
		id: string;
		role: string;
	}
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
	providers: [
		AuthentikProvider({
			clientId: process.env.AUTH_AUTHENTIK_ID,
			clientSecret: process.env.AUTH_AUTHENTIK_SECRET,
			issuer: process.env.AUTH_AUTHENTIK_ISSUER,
		}),
		/**
		 * ...add more providers here.
		 *
		 * Most other providers require a bit more work than the Discord provider. For example, the
		 * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
		 * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
		 *
		 * @see https://next-auth.js.org/providers/github
		 */
	],
	adapter: DrizzleAdapter(db, {
		usersTable: users,
		accountsTable: accounts,
		sessionsTable: sessions,
		verificationTokensTable: verificationTokens,
	}),
	callbacks: {
		async signIn({ user, account, profile }) {
			if (account?.provider === "authentik" && profile) {
				try {
					// Extract groups from Authentik profile
					// Authentik typically provides groups in the profile.groups field or claims
					const authentikGroups = (profile.groups as string[]) || [];

					if (authentikGroups.length > 0) {
						// Process each group
						for (const groupName of authentikGroups) {
							if (!groupName || typeof groupName !== "string") continue;

							// Check if group exists, create if not
							let existingGroup = await db.query.groups.findFirst({
								where: eq(groups.name, groupName),
							});

							if (!existingGroup) {
								// Create new group
								const [newGroup] = await db
									.insert(groups)
									.values({
										name: groupName,
										description: "Auto-created from Authentik SSO",
										isActive: true,
									})
									.returning();
								existingGroup = newGroup;
							}

							// Check if user is already in this group
							if (existingGroup) {
								const existingMembership = await db.query.userGroups.findFirst({
									where: and(
										eq(userGroups.userId, user.id as string),
										eq(userGroups.groupId, existingGroup.id),
									),
								});

								// Add user to group if not already a member
								if (!existingMembership) {
									await db.insert(userGroups).values({
										userId: user.id as string,
										groupId: existingGroup.id,
										role: "member", // default role
									});
								}
							}
						}
					}
				} catch (error) {
					console.error("Error processing Authentik groups:", error);
					// Don't fail the sign-in if group processing fails
				}
			}
			return true;
		},
		session: ({ session, user }) => ({
			...session,
			user: {
				...session.user,
				id: user.id,
				role: user.role,
			},
		}),
	},
} satisfies NextAuthConfig;
