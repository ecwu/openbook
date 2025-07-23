import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
	bookings,
	groups,
	resourceLimits,
	resources,
	userGroups,
	users,
} from "@/server/db/schema";
import { and, asc, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import { z } from "zod";

const limitCreateSchema = z.object({
	name: z.string().min(1).max(255),
	description: z.string().optional(),
	limitType: z.enum(["group", "user", "group_per_person"]),
	targetId: z.string(), // groupId or userId
	resourceId: z.string().optional(), // null for global limits
	maxHoursPerDay: z.number().int().min(0).optional(),
	maxHoursPerWeek: z.number().int().min(0).optional(),
	maxHoursPerMonth: z.number().int().min(0).optional(),
	maxConcurrentBookings: z.number().int().min(0).optional(),
	maxBookingsPerDay: z.number().int().min(0).optional(),
	allowedBookingTypes: z.array(z.enum(["shared", "exclusive"])).optional(),
	allowedTimeSlots: z.record(z.any()).optional(), // JSON for time restrictions
	priority: z.number().int().default(0),
	isActive: z.boolean().default(true),
});

const limitUpdateSchema = z.object({
	id: z.string(),
	name: z.string().min(1).max(255).optional(),
	description: z.string().optional(),
	maxHoursPerDay: z.number().int().min(0).optional(),
	maxHoursPerWeek: z.number().int().min(0).optional(),
	maxHoursPerMonth: z.number().int().min(0).optional(),
	maxConcurrentBookings: z.number().int().min(0).optional(),
	maxBookingsPerDay: z.number().int().min(0).optional(),
	allowedBookingTypes: z.array(z.enum(["shared", "exclusive"])).optional(),
	allowedTimeSlots: z.record(z.any()).optional(),
	priority: z.number().int().optional(),
	isActive: z.boolean().optional(),
});

export const limitsRouter = createTRPCRouter({
	// Get all limits with filtering (admin only)
	list: protectedProcedure
		.input(
			z.object({
				limitType: z.enum(["group", "user", "group_per_person"]).optional(),
				targetId: z.string().optional(),
				resourceId: z.string().optional(),
				isActive: z.boolean().optional(),
				limit: z.number().min(1).max(100).default(20),
				offset: z.number().min(0).default(0),
			}),
		)
		.query(async ({ ctx, input }) => {
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});

			if (currentUser?.role !== "admin") {
				throw new Error("Unauthorized: Admin access required");
			}

			const conditions = [];

			if (input.limitType) {
				conditions.push(eq(resourceLimits.limitType, input.limitType));
			}

			if (input.targetId) {
				conditions.push(eq(resourceLimits.targetId, input.targetId));
			}

			if (input.resourceId) {
				conditions.push(eq(resourceLimits.resourceId, input.resourceId));
			}

			if (input.isActive !== undefined) {
				conditions.push(eq(resourceLimits.isActive, input.isActive));
			}

			const whereClause =
				conditions.length > 0 ? and(...conditions) : undefined;

			const limits = await ctx.db.query.resourceLimits.findMany({
				where: whereClause,
				limit: input.limit,
				offset: input.offset,
				orderBy: desc(resourceLimits.createdAt),
				with: {
					resource: {
						columns: {
							id: true,
							name: true,
							type: true,
						},
					},
					createdBy: {
						columns: {
							id: true,
							name: true,
						},
					},
				},
			});

			// Enrich with target details (user or group info)
			const enrichedLimits = await Promise.all(
				limits.map(async (limit) => {
					let target = null;

					if (limit.limitType === "user") {
						target = await ctx.db.query.users.findFirst({
							where: eq(users.id, limit.targetId),
							columns: {
								id: true,
								name: true,
								email: true,
							},
						});
					} else if (
						limit.limitType === "group" ||
						limit.limitType === "group_per_person"
					) {
						target = await ctx.db.query.groups.findFirst({
							where: eq(groups.id, limit.targetId),
							columns: {
								id: true,
								name: true,
								description: true,
							},
						});
					}

					return {
						...limit,
						target,
					};
				}),
			);

			return enrichedLimits;
		}),

	// Get limits affecting a specific user
	getForUser: protectedProcedure
		.input(
			z.object({
				userId: z.string().optional(),
				resourceId: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});

			const targetUserId = input.userId || ctx.session.user.id;
			const isAdmin = currentUser?.role === "admin";

			if (!isAdmin && targetUserId !== ctx.session.user.id) {
				throw new Error("Unauthorized: Can only view own limits");
			}

			// Get user's direct limits
			const userLimits = await ctx.db.query.resourceLimits.findMany({
				where: and(
					eq(resourceLimits.limitType, "user"),
					eq(resourceLimits.targetId, targetUserId),
					eq(resourceLimits.isActive, true),
					...(input.resourceId
						? [eq(resourceLimits.resourceId, input.resourceId)]
						: []),
				),
				with: {
					resource: true,
				},
			});

			// Get user's groups
			const userGroupsList = await ctx.db.query.userGroups.findMany({
				where: eq(userGroups.userId, targetUserId),
			});
			const groupIds = userGroupsList.map((ug) => ug.groupId);

			// Get group limits
			const groupLimits = await ctx.db.query.resourceLimits.findMany({
				where: and(
					eq(resourceLimits.limitType, "group"),
					sql`${resourceLimits.targetId} IN (${groupIds.join(",")})`,
					eq(resourceLimits.isActive, true),
					...(input.resourceId
						? [eq(resourceLimits.resourceId, input.resourceId)]
						: []),
				),
				with: {
					resource: true,
				},
			});

			// Get group per-person limits
			const groupPerPersonLimits = await ctx.db.query.resourceLimits.findMany({
				where: and(
					eq(resourceLimits.limitType, "group_per_person"),
					sql`${resourceLimits.targetId} IN (${groupIds.join(",")})`,
					eq(resourceLimits.isActive, true),
					...(input.resourceId
						? [eq(resourceLimits.resourceId, input.resourceId)]
						: []),
				),
				with: {
					resource: true,
				},
			});

			return {
				userLimits,
				groupLimits,
				groupPerPersonLimits,
				effectiveLimits: [
					...userLimits,
					...groupLimits,
					...groupPerPersonLimits,
				].sort((a, b) => b.priority - a.priority), // Higher priority first
			};
		}),

	// Create new limit (admin only)
	create: protectedProcedure
		.input(limitCreateSchema)
		.mutation(async ({ ctx, input }) => {
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});

			if (currentUser?.role !== "admin") {
				throw new Error("Unauthorized: Admin access required");
			}

			// Validate target exists
			if (input.limitType === "user") {
				const user = await ctx.db.query.users.findFirst({
					where: eq(users.id, input.targetId),
				});
				if (!user) {
					throw new Error("Target user not found");
				}
			} else if (
				input.limitType === "group" ||
				input.limitType === "group_per_person"
			) {
				const group = await ctx.db.query.groups.findFirst({
					where: eq(groups.id, input.targetId),
				});
				if (!group) {
					throw new Error("Target group not found");
				}
			}

			// Validate resource exists if specified
			if (input.resourceId) {
				const resource = await ctx.db.query.resources.findFirst({
					where: eq(resources.id, input.resourceId),
				});
				if (!resource) {
					throw new Error("Resource not found");
				}
			}

			const [newLimit] = await ctx.db
				.insert(resourceLimits)
				.values({
					...input,
					createdById: ctx.session.user.id,
				})
				.returning();

			return newLimit;
		}),

	// Update limit (admin only)
	update: protectedProcedure
		.input(limitUpdateSchema)
		.mutation(async ({ ctx, input }) => {
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});

			if (currentUser?.role !== "admin") {
				throw new Error("Unauthorized: Admin access required");
			}

			const updateData: any = {};
			if (input.name) updateData.name = input.name;
			if (input.description !== undefined)
				updateData.description = input.description;
			if (input.maxHoursPerDay !== undefined)
				updateData.maxHoursPerDay = input.maxHoursPerDay;
			if (input.maxHoursPerWeek !== undefined)
				updateData.maxHoursPerWeek = input.maxHoursPerWeek;
			if (input.maxHoursPerMonth !== undefined)
				updateData.maxHoursPerMonth = input.maxHoursPerMonth;
			if (input.maxConcurrentBookings !== undefined)
				updateData.maxConcurrentBookings = input.maxConcurrentBookings;
			if (input.maxBookingsPerDay !== undefined)
				updateData.maxBookingsPerDay = input.maxBookingsPerDay;
			if (input.allowedBookingTypes)
				updateData.allowedBookingTypes = input.allowedBookingTypes;
			if (input.allowedTimeSlots)
				updateData.allowedTimeSlots = input.allowedTimeSlots;
			if (input.priority !== undefined) updateData.priority = input.priority;
			if (input.isActive !== undefined) updateData.isActive = input.isActive;

			const [updatedLimit] = await ctx.db
				.update(resourceLimits)
				.set(updateData)
				.where(eq(resourceLimits.id, input.id))
				.returning();

			return updatedLimit;
		}),

	// Delete limit (admin only)
	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});

			if (currentUser?.role !== "admin") {
				throw new Error("Unauthorized: Admin access required");
			}

			await ctx.db
				.delete(resourceLimits)
				.where(eq(resourceLimits.id, input.id));
			return { success: true };
		}),

	// Check if user can make a booking (validation helper)
	validateBooking: protectedProcedure
		.input(
			z.object({
				userId: z.string().optional(),
				resourceId: z.string(),
				startTime: z.date(),
				endTime: z.date(),
				bookingType: z.enum(["shared", "exclusive"]),
			}),
		)
		.query(async ({ ctx, input }) => {
			const targetUserId = input.userId || ctx.session.user.id;
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});

			const isAdmin = currentUser?.role === "admin";

			if (!isAdmin && targetUserId !== ctx.session.user.id) {
				throw new Error("Unauthorized: Can only validate own bookings");
			}

			// Get all applicable limits
			// TODO: Refactor to use shared helper function instead of calling procedure
			// const userLimitsData = await ctx.procedures.limits.getForUser({
			// 	userId: targetUserId,
			// 	resourceId: input.resourceId,
			// });

			// For now, return empty violations - this needs to be implemented properly
			// TODO: Implement proper limit validation by refactoring getForUser logic
			const violations: string[] = [];

			/* 
			// This logic is commented out until we properly fetch effectiveLimits
			
			// Check booking type restrictions
			for (const limit of effectiveLimits) {
				if (limit.allowedBookingTypes && limit.allowedBookingTypes.length > 0) {
					if (!limit.allowedBookingTypes.includes(input.bookingType)) {
						violations.push(
							`Booking type '${input.bookingType}' not allowed by limit: ${limit.name}`,
						);
					}
				}
			}

			// ... rest of validation logic ...
			*/

			return {
				valid: violations.length === 0,
				violations,
				usageStats: {
					dailyHours: 0,
					weeklyHours: 0,
					monthlyHours: 0,
					concurrentBookings: 0,
					dailyBookings: 0,
				},
			};
		}),

	// Get usage statistics for a user
	getUsageStats: protectedProcedure
		.input(
			z.object({
				userId: z.string().optional(),
				resourceId: z.string().optional(),
				startDate: z.date().optional(),
				endDate: z.date().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const targetUserId = input.userId || ctx.session.user.id;
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});

			const isAdmin = currentUser?.role === "admin";

			if (!isAdmin && targetUserId !== ctx.session.user.id) {
				throw new Error("Unauthorized: Can only view own usage statistics");
			}

			const now = new Date();
			const startDate =
				input.startDate || new Date(now.getFullYear(), now.getMonth(), 1);
			const endDate =
				input.endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0);

			const conditions = [
				eq(bookings.userId, targetUserId),
				gte(bookings.startTime, startDate),
				lte(bookings.endTime, endDate),
				or(
					eq(bookings.status, "approved"),
					eq(bookings.status, "active"),
					eq(bookings.status, "completed"),
				),
			];

			if (input.resourceId) {
				conditions.push(eq(bookings.resourceId, input.resourceId));
			}

			const userBookings = await ctx.db.query.bookings.findMany({
				where: and(...conditions),
				with: {
					resource: {
						columns: {
							id: true,
							name: true,
							type: true,
						},
					},
				},
			});

			const totalHours = userBookings.reduce((acc, booking) => {
				const hours =
					(booking.endTime.getTime() - booking.startTime.getTime()) /
					(1000 * 60 * 60);
				return acc + hours;
			}, 0);

			const byResource = userBookings.reduce(
				(acc, booking) => {
					const resourceName = booking.resource.name;
					const hours =
						(booking.endTime.getTime() - booking.startTime.getTime()) /
						(1000 * 60 * 60);

					if (!acc[resourceName]) {
						acc[resourceName] = {
							count: 0,
							hours: 0,
							resource: booking.resource,
						};
					}
					acc[resourceName].count += 1;
					acc[resourceName].hours += hours;

					return acc;
				},
				{} as Record<string, { count: number; hours: number; resource: { id: string; name: string; type: string } }>,
			);

			return {
				period: { startDate, endDate },
				totalBookings: userBookings.length,
				totalHours,
				averageBookingDuration:
					userBookings.length > 0 ? totalHours / userBookings.length : 0,
				byResource,
				byStatus: {
					approved: userBookings.filter((b) => b.status === "approved").length,
					active: userBookings.filter((b) => b.status === "active").length,
					completed: userBookings.filter((b) => b.status === "completed")
						.length,
				},
			};
		}),
});
