import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
	groupResourceAccess,
	groups,
	resourceLimits,
	resources,
	userGroups,
	users,
} from "@/server/db/schema";
import { and, asc, desc, eq, ilike } from "drizzle-orm";
import { z } from "zod";

const groupCreateSchema = z.object({
	name: z.string().min(1).max(255),
	description: z.string().optional(),
	isActive: z.boolean().default(true),
});

const groupUpdateSchema = z.object({
	id: z.string(),
	name: z.string().min(1).max(255).optional(),
	description: z.string().optional(),
	isActive: z.boolean().optional(),
});

export const groupsRouter = createTRPCRouter({
	// Get all groups with filtering and pagination (admin only)
	list: protectedProcedure
		.input(
			z.object({
				search: z.string().optional(),
				isActive: z.boolean().optional(),
				limit: z.number().min(1).max(100).default(20),
				offset: z.number().min(0).default(0),
				sortBy: z.enum(["name", "createdAt"]).default("name"),
				sortOrder: z.enum(["asc", "desc"]).default("asc"),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Check if user is admin
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});
			if (currentUser?.role !== "admin") {
				throw new Error("Unauthorized: Admin access required");
			}

			let whereClause = undefined;
			if (input.search || input.isActive !== undefined) {
				const conditions = [];

				if (input.search) {
					conditions.push(ilike(groups.name, `%${input.search}%`));
				}

				if (input.isActive !== undefined) {
					conditions.push(eq(groups.isActive, input.isActive));
				}

				whereClause = and(...conditions);
			}

			const orderBy =
				input.sortOrder === "asc"
					? asc(groups[input.sortBy])
					: desc(groups[input.sortBy]);

			const groupsList = await ctx.db.query.groups.findMany({
				where: whereClause,
				limit: input.limit,
				offset: input.offset,
				orderBy,
				with: {
					userGroups: {
						with: {
							user: {
								columns: {
									id: true,
									name: true,
									email: true,
								},
							},
						},
					},
					resourceAccess: {
						with: {
							resource: {
								columns: {
									id: true,
									name: true,
									type: true,
								},
							},
						},
					},
				},
			});

			return groupsList.map((group) => ({
				...group,
				memberCount: group.userGroups.length,
				members: group.userGroups.map((ug) => ({
					...ug.user,
					role: ug.role,
				})),
				accessibleResources: group.resourceAccess.filter(
					(ra) => ra.accessType === "allowed",
				),
				deniedResources: group.resourceAccess.filter(
					(ra) => ra.accessType === "denied",
				),
			}));
		}),

	// Get user's groups
	myGroups: protectedProcedure.query(async ({ ctx }) => {
		const userGroupsList = await ctx.db.query.userGroups.findMany({
			where: eq(userGroups.userId, ctx.session.user.id),
			with: {
				group: {
					with: {
						resourceAccess: {
							with: {
								resource: true,
							},
						},
					},
				},
			},
		});

		return userGroupsList.map((ug) => ({
			...ug.group,
			role: ug.role,
			accessibleResources: ug.group.resourceAccess
				.filter((ra) => ra.accessType === "allowed")
				.map((ra) => ra.resource),
		}));
	}),

	// Get group by ID with detailed info
	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			// Check if user is admin or member of the group
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});

			const isAdmin = currentUser?.role === "admin";

			if (!isAdmin) {
				// Check if user is member of this group
				const membership = await ctx.db.query.userGroups.findFirst({
					where: and(
						eq(userGroups.userId, ctx.session.user.id),
						eq(userGroups.groupId, input.id),
					),
				});

				if (!membership) {
					throw new Error("Unauthorized: Not a member of this group");
				}
			}

			const group = await ctx.db.query.groups.findFirst({
				where: eq(groups.id, input.id),
				with: {
					userGroups: {
						with: {
							user: {
								columns: {
									id: true,
									name: true,
									email: true,
									role: true,
								},
							},
						},
					},
					resourceAccess: {
						with: {
							resource: true,
							createdBy: {
								columns: {
									id: true,
									name: true,
								},
							},
						},
					},
					resourceLimits: {
						where: eq(resourceLimits.limitType, "group"),
						with: {
							resource: true,
							createdBy: {
								columns: {
									id: true,
									name: true,
								},
							},
						},
					},
				},
			});

			if (!group) {
				throw new Error("Group not found");
			}

			return {
				...group,
				members: group.userGroups.map((ug) => ({
					...ug.user,
					groupRole: ug.role,
				})),
				accessibleResources: group.resourceAccess
					.filter((ra) => ra.accessType === "allowed")
					.map((ra) => ra.resource),
				deniedResources: group.resourceAccess
					.filter((ra) => ra.accessType === "denied")
					.map((ra) => ra.resource),
				limits: group.resourceLimits,
			};
		}),

	// Create new group (admin only)
	create: protectedProcedure
		.input(groupCreateSchema)
		.mutation(async ({ ctx, input }) => {
			// Check if user is admin
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});
			if (currentUser?.role !== "admin") {
				throw new Error("Unauthorized: Admin access required");
			}

			// Check if group name already exists
			const existingGroup = await ctx.db.query.groups.findFirst({
				where: eq(groups.name, input.name),
			});
			if (existingGroup) {
				throw new Error("Group with this name already exists");
			}

			const [newGroup] = await ctx.db.insert(groups).values(input).returning();
			return newGroup;
		}),

	// Update group (admin only)
	update: protectedProcedure
		.input(groupUpdateSchema)
		.mutation(async ({ ctx, input }) => {
			// Check if user is admin
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});
			if (currentUser?.role !== "admin") {
				throw new Error("Unauthorized: Admin access required");
			}

			// Check if new name conflicts with existing group
			if (input.name) {
				const existingGroup = await ctx.db.query.groups.findFirst({
					where: and(
						eq(groups.name, input.name),
						// Exclude current group from check
						eq(groups.id, input.id),
					),
				});
				if (existingGroup && existingGroup.id !== input.id) {
					throw new Error("Group with this name already exists");
				}
			}

			const [updatedGroup] = await ctx.db
				.update(groups)
				.set({
					...(input.name && { name: input.name }),
					...(input.description !== undefined && {
						description: input.description,
					}),
					...(input.isActive !== undefined && { isActive: input.isActive }),
				})
				.where(eq(groups.id, input.id))
				.returning();

			return updatedGroup;
		}),

	// Set resource access for group (admin only)
	setResourceAccess: protectedProcedure
		.input(
			z.object({
				groupId: z.string(),
				resourceId: z.string(),
				accessType: z.enum(["allowed", "denied"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Check if user is admin
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});
			if (currentUser?.role !== "admin") {
				throw new Error("Unauthorized: Admin access required");
			}

			// Check if group and resource exist
			const group = await ctx.db.query.groups.findFirst({
				where: eq(groups.id, input.groupId),
			});
			const resource = await ctx.db.query.resources.findFirst({
				where: eq(resources.id, input.resourceId),
			});

			if (!group || !resource) {
				throw new Error("Group or resource not found");
			}

			// Upsert access control
			const existing = await ctx.db.query.groupResourceAccess.findFirst({
				where: and(
					eq(groupResourceAccess.groupId, input.groupId),
					eq(groupResourceAccess.resourceId, input.resourceId),
				),
			});

			if (existing) {
				const [updated] = await ctx.db
					.update(groupResourceAccess)
					.set({
						accessType: input.accessType,
						createdById: ctx.session.user.id,
					})
					.where(
						and(
							eq(groupResourceAccess.groupId, input.groupId),
							eq(groupResourceAccess.resourceId, input.resourceId),
						),
					)
					.returning();
				return updated;
			} else {
				const [created] = await ctx.db
					.insert(groupResourceAccess)
					.values({
						...input,
						createdById: ctx.session.user.id,
					})
					.returning();
				return created;
			}
		}),

	// Remove resource access for group (admin only)
	removeResourceAccess: protectedProcedure
		.input(
			z.object({
				groupId: z.string(),
				resourceId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Check if user is admin
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});
			if (currentUser?.role !== "admin") {
				throw new Error("Unauthorized: Admin access required");
			}

			await ctx.db
				.delete(groupResourceAccess)
				.where(
					and(
						eq(groupResourceAccess.groupId, input.groupId),
						eq(groupResourceAccess.resourceId, input.resourceId),
					),
				);

			return { success: true };
		}),

	// Get accessible resources for a group
	getAccessibleResources: protectedProcedure
		.input(z.object({ groupId: z.string() }))
		.query(async ({ ctx, input }) => {
			// Check if user is admin or member of the group
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});

			const isAdmin = currentUser?.role === "admin";

			if (!isAdmin) {
				const membership = await ctx.db.query.userGroups.findFirst({
					where: and(
						eq(userGroups.userId, ctx.session.user.id),
						eq(userGroups.groupId, input.groupId),
					),
				});

				if (!membership) {
					throw new Error("Unauthorized: Not a member of this group");
				}
			}

			// Get all resources with their access settings for this group
			const allResources = await ctx.db.query.resources.findMany({
				where: eq(resources.isActive, true),
				with: {
					groupAccess: {
						where: eq(groupResourceAccess.groupId, input.groupId),
					},
				},
			});

			// Filter resources based on access control
			// Default behavior: if no explicit access control, resource is accessible
			// If there are "allowed" entries, only those are accessible
			// If there are "denied" entries, those are excluded
			const allowedResources = allResources.filter((resource) => {
				const accessRules = resource.groupAccess;

				if (accessRules.length === 0) {
					return true; // No rules = default access
				}

				const hasAllowRule = accessRules.some(
					(rule) => rule.accessType === "allowed",
				);
				const hasDenyRule = accessRules.some(
					(rule) => rule.accessType === "denied",
				);

				if (hasDenyRule) {
					return false; // Explicit deny
				}

				if (hasAllowRule) {
					return true; // Explicit allow
				}

				return true; // Default allow
			});

			return allowedResources;
		}),
});
