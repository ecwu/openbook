import { env } from "@/env";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
	bookings,
	groupResourceAccess,
	resourceLimits,
	resources,
	userGroups,
	users,
} from "@/server/db/schema";
import { and, asc, desc, eq, gte, lte, not, or, sql } from "drizzle-orm";

function getResourceColor(resourceId: string, resourceName: string): string {
	// Generate a consistent color based on resource ID/name
	let hash = 0;
	const str = `${resourceId}-${resourceName}`;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}

	// Generate HSL color with good saturation and lightness for readability
	const hue = Math.abs(hash) % 360;
	const saturation = 65 + (Math.abs(hash) % 20); // 65-85%
	const lightness = 45 + (Math.abs(hash) % 15); // 45-60%

	return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

import { z } from "zod";

const bookingCreateSchema = z.object({
	resourceId: z.string(),
	title: z.string().min(1).max(255),
	description: z.string().optional(),
	startTime: z.date().refine(
		(date) => {
			const twoHoursAgo = new Date();
			twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
			return date >= twoHoursAgo;
		},
		{
			message: "Start time cannot be earlier than 2 hours ago",
		},
	),
	endTime: z.date(),
	requestedQuantity: z.number().int().min(1),
	bookingType: z.enum(["shared", "exclusive"]),
	priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
	metadata: z.record(z.any()).optional(),
});

const bookingUpdateSchema = z.object({
	id: z.string(),
	title: z.string().min(1).max(255).optional(),
	description: z.string().optional(),
	startTime: z
		.date()
		.refine(
			(date) => {
				const twoHoursAgo = new Date();
				twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
				return date >= twoHoursAgo;
			},
			{
				message: "Start time cannot be earlier than 2 hours ago",
			},
		)
		.optional(),
	endTime: z.date().optional(),
	requestedQuantity: z.number().int().min(1).optional(),
	bookingType: z.enum(["shared", "exclusive"]).optional(),
	priority: z.enum(["low", "normal", "high", "critical"]).optional(),
	metadata: z.record(z.any()).optional(),
});

export const bookingsRouter = createTRPCRouter({
	// Get bookings with filtering and pagination
	list: protectedProcedure
		.input(
			z.object({
				resourceId: z.string().optional(),
				userId: z.string().optional(),
				status: z
					.enum([
						"pending",
						"approved",
						"active",
						"completed",
						"cancelled",
						"rejected",
					])
					.optional(),
				startDate: z.date().optional(),
				endDate: z.date().optional(),
				limit: z.number().min(1).max(100).default(20),
				offset: z.number().min(0).default(0),
				sortBy: z
					.enum(["startTime", "endTime", "createdAt", "title"])
					.default("startTime"),
				sortOrder: z.enum(["asc", "desc"]).default("desc"),
				// Filter by own bookings
				myBookingsOnly: z.boolean().default(false),
			}),
		)
		.query(async ({ ctx, input }) => {
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});

			const isAdmin = currentUser?.role === "admin";

			const conditions = [];

			// Non-admin users can only see their own bookings unless specified otherwise
			if (!isAdmin || input.myBookingsOnly) {
				conditions.push(eq(bookings.userId, ctx.session.user.id));
			} else if (input.userId) {
				conditions.push(eq(bookings.userId, input.userId));
			}

			if (input.resourceId) {
				conditions.push(eq(bookings.resourceId, input.resourceId));
			}

			if (input.status) {
				conditions.push(eq(bookings.status, input.status));
			}

			if (input.startDate) {
				conditions.push(gte(bookings.startTime, input.startDate));
			}

			if (input.endDate) {
				conditions.push(lte(bookings.endTime, input.endDate));
			}

			const whereClause =
				conditions.length > 0 ? and(...conditions) : undefined;

			const orderBy =
				input.sortOrder === "asc"
					? asc(bookings[input.sortBy])
					: desc(bookings[input.sortBy]);

			const bookingsList = await ctx.db.query.bookings.findMany({
				where: whereClause,
				limit: input.limit,
				offset: input.offset,
				orderBy,
				with: {
					resource: true,
					user: {
						columns: {
							id: true,
							name: true,
							email: true,
						},
					},
					approvedBy: {
						columns: {
							id: true,
							name: true,
						},
					},
				},
			});

			return bookingsList;
		}),

	// Get booking by ID
	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});

			const booking = await ctx.db.query.bookings.findFirst({
				where: eq(bookings.id, input.id),
				with: {
					resource: true,
					user: {
						columns: {
							id: true,
							name: true,
							email: true,
						},
					},
					approvedBy: {
						columns: {
							id: true,
							name: true,
						},
					},
				},
			});

			if (!booking) {
				throw new Error("Booking not found");
			}

			const isAdmin = currentUser?.role === "admin";
			const isOwner = booking.userId === ctx.session.user.id;

			if (!isAdmin && !isOwner) {
				throw new Error("Unauthorized: Can only view own bookings");
			}

			return booking;
		}),

	// Create new booking
	create: protectedProcedure
		.input(bookingCreateSchema)
		.mutation(async ({ ctx, input }) => {
			// Validate end time is after start time
			if (input.endTime <= input.startTime) {
				throw new Error("End time must be after start time");
			}

			// Check if resource exists and is available
			const resource = await ctx.db.query.resources.findFirst({
				where: eq(resources.id, input.resourceId),
				with: {
					groupAccess: true,
				},
			});

			if (!resource || !resource.isActive || resource.status !== "available") {
				throw new Error("Resource not available");
			}

			// Check user access to resource
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});

			const isAdmin = currentUser?.role === "admin";

			if (!isAdmin) {
				// Check group access
				const userGroupsData = await ctx.db.query.userGroups.findMany({
					where: eq(userGroups.userId, ctx.session.user.id),
				});
				const userGroupIds = userGroupsData.map((ug) => ug.groupId);

				const accessRules = resource.groupAccess.filter((rule) =>
					userGroupIds.includes(rule.groupId),
				);

				if (accessRules.length > 0) {
					const hasDeny = accessRules.some(
						(rule) => rule.accessType === "denied",
					);
					const hasAllow = accessRules.some(
						(rule) => rule.accessType === "allowed",
					);

					if (hasDeny || (!hasAllow && accessRules.length > 0)) {
						throw new Error("Access denied to this resource");
					}
				}
			}

			// Check resource capacity constraints
			if (
				resource.isIndivisible &&
				input.requestedQuantity !== resource.totalCapacity
			) {
				throw new Error(
					`Resource is indivisible and requires full allocation of ${resource.totalCapacity} ${resource.capacityUnit}`,
				);
			}

			if (
				resource.minAllocation &&
				input.requestedQuantity < resource.minAllocation
			) {
				throw new Error(
					`Requested quantity is below minimum allocation of ${resource.minAllocation} ${resource.capacityUnit}`,
				);
			}

			if (
				resource.maxAllocation &&
				input.requestedQuantity > resource.maxAllocation
			) {
				throw new Error(
					`Requested quantity exceeds maximum allocation of ${resource.maxAllocation} ${resource.capacityUnit}`,
				);
			}

			// Get overlapping bookings to check capacity
			const overlappingBookings = await ctx.db.query.bookings.findMany({
				where: and(
					eq(bookings.resourceId, input.resourceId),
					or(
						eq(bookings.status, "approved"),
						eq(bookings.status, "active"),
						eq(bookings.status, "pending"),
					),
					// Time overlap check
					or(
						and(
							gte(bookings.startTime, input.startTime),
							lte(bookings.startTime, input.endTime),
						),
						and(
							gte(bookings.endTime, input.startTime),
							lte(bookings.endTime, input.endTime),
						),
						and(
							lte(bookings.startTime, input.startTime),
							gte(bookings.endTime, input.endTime),
						),
						and(
							gte(bookings.startTime, input.startTime),
							lte(bookings.endTime, input.endTime),
						),
					),
				),
			});

			// Calculate current allocation during this time period
			const currentAllocation = overlappingBookings.reduce((total, booking) => {
				return (
					total + (booking.allocatedQuantity || booking.requestedQuantity || 0)
				);
			}, 0);

			const availableCapacity = resource.totalCapacity - currentAllocation;

			if (input.requestedQuantity > availableCapacity) {
				throw new Error(
					`Insufficient capacity. Available: ${availableCapacity} ${resource.capacityUnit}, Requested: ${input.requestedQuantity} ${resource.capacityUnit}`,
				);
			}

			// For exclusive bookings on non-indivisible resources, check if requesting full capacity
			if (input.bookingType === "exclusive" && !resource.isIndivisible) {
				if (input.requestedQuantity !== resource.totalCapacity) {
					throw new Error(
						"Exclusive bookings require full resource capacity allocation",
					);
				}
			}

			// For indivisible resources, booking type must be exclusive
			if (resource.isIndivisible && input.bookingType !== "exclusive") {
				throw new Error("Indivisible resources can only be booked exclusively");
			}

			// Check resource limits for non-admin users
			if (!isAdmin) {
				// Validate booking against resource limits
				const violations: string[] = [];

				// Get user's direct limits
				const userLimits = await ctx.db.query.resourceLimits.findMany({
					where: and(
						eq(resourceLimits.limitType, "user"),
						eq(resourceLimits.targetId, ctx.session.user.id),
						eq(resourceLimits.isActive, true),
						or(
							eq(resourceLimits.resourceId, input.resourceId),
							sql`${resourceLimits.resourceId} IS NULL`,
						),
					),
				});

				// Create system default limits object
				const systemDefaults = {
					id: "system-default",
					name: "System Default Limits",
					description: "System-wide default limits for all users",
					limitType: "user" as const,
					targetId: ctx.session.user.id,
					resourceId: null,
					maxHoursPerDay: env.DEFAULT_MAX_HOURS_PER_DAY,
					maxHoursPerWeek: env.DEFAULT_MAX_HOURS_PER_WEEK,
					maxHoursPerMonth: env.DEFAULT_MAX_HOURS_PER_MONTH,
					maxConcurrentBookings: null,
					maxBookingsPerDay: null,
					allowedBookingTypes: null,
					allowedTimeSlots: null,
					priority: -1000, // Lowest priority - system defaults are fallback
					isActive: true,
					createdAt: new Date(),
					updatedAt: new Date(),
					createdById: "system",
				};

				const effectiveLimits = [...userLimits, systemDefaults].sort(
					(a, b) => b.priority - a.priority,
				);

				if (effectiveLimits.length > 0) {
					// Calculate booking duration in hours
					const bookingDurationHours =
						(input.endTime.getTime() - input.startTime.getTime()) /
						(1000 * 60 * 60);

					// Calculate current usage for time-based limits
					const bookingDate = new Date(input.startTime);
					const startOfDay = new Date(
						bookingDate.getFullYear(),
						bookingDate.getMonth(),
						bookingDate.getDate(),
					);
					const startOfWeek = new Date(startOfDay);
					startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
					const startOfMonth = new Date(
						bookingDate.getFullYear(),
						bookingDate.getMonth(),
						1,
					);

					// Get existing bookings for usage calculation
					const existingBookings = await ctx.db.query.bookings.findMany({
						where: and(
							eq(bookings.userId, ctx.session.user.id),
							or(
								eq(bookings.status, "approved"),
								eq(bookings.status, "active"),
								eq(bookings.status, "pending"),
							),
							gte(bookings.startTime, startOfMonth),
						),
					});

					// Calculate current usage
					const dailyBookings = existingBookings.filter(
						(b) => b.startTime >= startOfDay,
					);
					const weeklyBookings = existingBookings.filter(
						(b) => b.startTime >= startOfWeek,
					);
					const monthlyBookings = existingBookings.filter(
						(b) => b.startTime >= startOfMonth,
					);

					const dailyHours = dailyBookings.reduce((acc, booking) => {
						return (
							acc +
							(booking.endTime.getTime() - booking.startTime.getTime()) /
								(1000 * 60 * 60)
						);
					}, 0);

					const weeklyHours = weeklyBookings.reduce((acc, booking) => {
						return (
							acc +
							(booking.endTime.getTime() - booking.startTime.getTime()) /
								(1000 * 60 * 60)
						);
					}, 0);

					const monthlyHours = monthlyBookings.reduce((acc, booking) => {
						return (
							acc +
							(booking.endTime.getTime() - booking.startTime.getTime()) /
								(1000 * 60 * 60)
						);
					}, 0);

					// Count concurrent bookings
					const concurrentBookings = existingBookings.filter((booking) => {
						return (
							booking.startTime < input.endTime &&
							booking.endTime > input.startTime
						);
					}).length;

					// Check limits
					for (const limit of effectiveLimits) {
						// Check booking type restrictions
						if (limit.allowedBookingTypes) {
							const allowedTypes = Array.isArray(limit.allowedBookingTypes)
								? limit.allowedBookingTypes
								: (JSON.parse(limit.allowedBookingTypes as string) as string[]);

							if (allowedTypes.length === 0) continue;

							if (!allowedTypes.includes(input.bookingType)) {
								violations.push(
									`Booking type '${input.bookingType}' not allowed by limit: ${limit.name}`,
								);
							}
						}

						// Daily hours limit
						if (
							limit.maxHoursPerDay !== null &&
							limit.maxHoursPerDay !== undefined
						) {
							const projectedDailyHours = dailyHours + bookingDurationHours;
							if (projectedDailyHours > limit.maxHoursPerDay) {
								violations.push(
									`Would exceed daily limit of ${limit.maxHoursPerDay} hours (current: ${dailyHours.toFixed(2)}h, requested: ${bookingDurationHours.toFixed(2)}h) - ${limit.name}`,
								);
							}
						}

						// Weekly hours limit
						if (
							limit.maxHoursPerWeek !== null &&
							limit.maxHoursPerWeek !== undefined
						) {
							const projectedWeeklyHours = weeklyHours + bookingDurationHours;
							if (projectedWeeklyHours > limit.maxHoursPerWeek) {
								violations.push(
									`Would exceed weekly limit of ${limit.maxHoursPerWeek} hours (current: ${weeklyHours.toFixed(2)}h, requested: ${bookingDurationHours.toFixed(2)}h) - ${limit.name}`,
								);
							}
						}

						// Monthly hours limit
						if (
							limit.maxHoursPerMonth !== null &&
							limit.maxHoursPerMonth !== undefined
						) {
							const projectedMonthlyHours = monthlyHours + bookingDurationHours;
							if (projectedMonthlyHours > limit.maxHoursPerMonth) {
								violations.push(
									`Would exceed monthly limit of ${limit.maxHoursPerMonth} hours (current: ${monthlyHours.toFixed(2)}h, requested: ${bookingDurationHours.toFixed(2)}h) - ${limit.name}`,
								);
							}
						}

						// Concurrent bookings limit
						if (
							limit.maxConcurrentBookings !== null &&
							limit.maxConcurrentBookings !== undefined
						) {
							if (concurrentBookings >= limit.maxConcurrentBookings) {
								violations.push(
									`Would exceed concurrent bookings limit of ${limit.maxConcurrentBookings} (current: ${concurrentBookings}) - ${limit.name}`,
								);
							}
						}

						// Daily bookings limit
						if (
							limit.maxBookingsPerDay !== null &&
							limit.maxBookingsPerDay !== undefined
						) {
							if (dailyBookings.length >= limit.maxBookingsPerDay) {
								violations.push(
									`Would exceed daily bookings limit of ${limit.maxBookingsPerDay} (current: ${dailyBookings.length}) - ${limit.name}`,
								);
							}
						}
					}

					if (violations.length > 0) {
						throw new Error(
							`Booking violates resource limits:\n${violations.join("\n")}`,
						);
					}
				}
			}

			// Create the booking
			const [newBooking] = await ctx.db
				.insert(bookings)
				.values({
					...input,
					userId: ctx.session.user.id,
					status: isAdmin ? "approved" : "pending", // Admin bookings auto-approved
					...(isAdmin && {
						approvedById: ctx.session.user.id,
						approvedAt: new Date(),
					}),
				})
				.returning();

			return newBooking;
		}),

	// Update booking (owner or admin)
	update: protectedProcedure
		.input(bookingUpdateSchema)
		.mutation(async ({ ctx, input }) => {
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});

			const booking = await ctx.db.query.bookings.findFirst({
				where: eq(bookings.id, input.id),
			});

			if (!booking) {
				throw new Error("Booking not found");
			}

			const isAdmin = currentUser?.role === "admin";
			const isOwner = booking.userId === ctx.session.user.id;

			if (!isAdmin && !isOwner) {
				throw new Error("Unauthorized: Can only update own bookings");
			}

			// Can't update completed or cancelled bookings
			if (booking.status === "completed" || booking.status === "cancelled") {
				throw new Error("Cannot update completed or cancelled bookings");
			}

			// Prevent updating past bookings (end time < now)
			const now = new Date();
			if (booking.endTime < now) {
				throw new Error("Cannot update bookings that have already ended");
			}

			// If changing times or quantity, validate and check conflicts
			if (input.startTime || input.endTime || input.requestedQuantity) {
				const newStartTime = input.startTime || booking.startTime;
				const newEndTime = input.endTime || booking.endTime;
				const newQuantity =
					input.requestedQuantity || booking.requestedQuantity;

				if (newEndTime <= newStartTime) {
					throw new Error("End time must be after start time");
				}

				const resource = await ctx.db.query.resources.findFirst({
					where: eq(resources.id, booking.resourceId),
				});

				if (!resource) {
					throw new Error("Resource not found");
				}

				// Check resource capacity constraints
				if (resource.isIndivisible && newQuantity !== resource.totalCapacity) {
					throw new Error(
						`Resource is indivisible and requires full allocation of ${resource.totalCapacity} ${resource.capacityUnit}`,
					);
				}

				if (resource.minAllocation && newQuantity < resource.minAllocation) {
					throw new Error(
						`Requested quantity is below minimum allocation of ${resource.minAllocation} ${resource.capacityUnit}`,
					);
				}

				if (resource.maxAllocation && newQuantity > resource.maxAllocation) {
					throw new Error(
						`Requested quantity exceeds maximum allocation of ${resource.maxAllocation} ${resource.capacityUnit}`,
					);
				}

				// Get overlapping bookings (excluding current booking)
				const overlappingBookings = await ctx.db.query.bookings.findMany({
					where: and(
						eq(bookings.resourceId, booking.resourceId),
						or(
							eq(bookings.status, "approved"),
							eq(bookings.status, "active"),
							eq(bookings.status, "pending"),
						),
						sql`${bookings.id} != ${input.id}`,
						// Time overlap check
						or(
							and(
								gte(bookings.startTime, newStartTime),
								lte(bookings.startTime, newEndTime),
							),
							and(
								gte(bookings.endTime, newStartTime),
								lte(bookings.endTime, newEndTime),
							),
							and(
								lte(bookings.startTime, newStartTime),
								gte(bookings.endTime, newEndTime),
							),
							and(
								gte(bookings.startTime, newStartTime),
								lte(bookings.endTime, newEndTime),
							),
						),
					),
				});

				// Calculate current allocation during this time period
				const currentAllocation = overlappingBookings.reduce(
					(total, booking) => {
						return (
							total +
							(booking.allocatedQuantity || booking.requestedQuantity || 0)
						);
					},
					0,
				);

				const availableCapacity = resource.totalCapacity - currentAllocation;

				if (newQuantity > availableCapacity) {
					throw new Error(
						`Insufficient capacity. Available: ${availableCapacity} ${resource.capacityUnit}, Requested: ${newQuantity} ${resource.capacityUnit}`,
					);
				}

				const newBookingType = input.bookingType || booking.bookingType;

				// For exclusive bookings on non-indivisible resources, check if requesting full capacity
				if (newBookingType === "exclusive" && !resource.isIndivisible) {
					if (newQuantity !== resource.totalCapacity) {
						throw new Error(
							"Exclusive bookings require full resource capacity allocation",
						);
					}
				}

				// For indivisible resources, booking type must be exclusive
				if (resource.isIndivisible && newBookingType !== "exclusive") {
					throw new Error(
						"Indivisible resources can only be booked exclusively",
					);
				}
			}

			const updateData: Record<string, unknown> = {};
			if (input.title) updateData.title = input.title;
			if (input.description !== undefined)
				updateData.description = input.description;
			if (input.startTime) updateData.startTime = input.startTime;
			if (input.endTime) updateData.endTime = input.endTime;
			if (input.requestedQuantity)
				updateData.requestedQuantity = input.requestedQuantity;
			if (input.bookingType) updateData.bookingType = input.bookingType;
			if (input.priority) updateData.priority = input.priority;
			if (input.metadata) updateData.metadata = input.metadata;

			const [updatedBooking] = await ctx.db
				.update(bookings)
				.set(updateData)
				.where(eq(bookings.id, input.id))
				.returning();

			return updatedBooking;
		}),

	// Approve booking (admin only)
	approve: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				allocatedQuantity: z.number().int().min(1).optional(), // admin can adjust allocated amount
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});

			if (currentUser?.role !== "admin") {
				throw new Error("Unauthorized: Admin access required");
			}

			const booking = await ctx.db.query.bookings.findFirst({
				where: eq(bookings.id, input.id),
			});

			if (!booking) {
				throw new Error("Booking not found");
			}

			// If admin specifies allocated quantity, validate it doesn't exceed requested
			let allocatedQuantity = booking.requestedQuantity;
			if (input.allocatedQuantity) {
				if (input.allocatedQuantity > booking.requestedQuantity) {
					throw new Error(
						"Allocated quantity cannot exceed requested quantity",
					);
				}
				allocatedQuantity = input.allocatedQuantity;
			}

			const [approvedBooking] = await ctx.db
				.update(bookings)
				.set({
					status: "approved",
					allocatedQuantity,
					approvedById: ctx.session.user.id,
					approvedAt: new Date(),
				})
				.where(eq(bookings.id, input.id))
				.returning();

			return approvedBooking;
		}),

	// Reject booking (admin only)
	reject: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				reason: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});

			if (currentUser?.role !== "admin") {
				throw new Error("Unauthorized: Admin access required");
			}

			const [rejectedBooking] = await ctx.db
				.update(bookings)
				.set({
					status: "rejected",
					rejectionReason: input.reason,
					approvedById: ctx.session.user.id,
					approvedAt: new Date(),
				})
				.where(eq(bookings.id, input.id))
				.returning();

			return rejectedBooking;
		}),

	// Cancel booking (owner or admin)
	cancel: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});

			const booking = await ctx.db.query.bookings.findFirst({
				where: eq(bookings.id, input.id),
			});

			if (!booking) {
				throw new Error("Booking not found");
			}

			const isAdmin = currentUser?.role === "admin";
			const isOwner = booking.userId === ctx.session.user.id;

			if (!isAdmin && !isOwner) {
				throw new Error("Unauthorized: Can only cancel own bookings");
			}

			if (booking.status === "completed" || booking.status === "cancelled") {
				throw new Error(
					"Cannot cancel completed or already cancelled bookings",
				);
			}

			// Prevent canceling past bookings (end time < now)
			const now = new Date();
			if (booking.endTime < now) {
				throw new Error("Cannot cancel bookings that have already ended");
			}

			const [cancelledBooking] = await ctx.db
				.update(bookings)
				.set({ status: "cancelled" })
				.where(eq(bookings.id, input.id))
				.returning();

			return cancelledBooking;
		}),

	// Get calendar events for FullCalendar
	getCalendarEvents: protectedProcedure
		.input(
			z.object({
				start: z.date(),
				end: z.date(),
				resourceId: z.string().optional(),
				resourceType: z.string().optional(),
				myBookingsOnly: z.boolean().default(false),
			}),
		)
		.query(async ({ ctx, input }) => {
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});

			const isAdmin = currentUser?.role === "admin";

			const conditions = [
				gte(bookings.startTime, input.start),
				lte(bookings.endTime, input.end),
				or(
					eq(bookings.status, "approved"),
					eq(bookings.status, "active"),
					eq(bookings.status, "pending"),
				),
			];

			if (input.resourceId) {
				conditions.push(eq(bookings.resourceId, input.resourceId));
			}

			if (!isAdmin || input.myBookingsOnly) {
				conditions.push(eq(bookings.userId, ctx.session.user.id));
			}

			const calendarBookings = await ctx.db.query.bookings.findMany({
				where: and(...conditions),
				with: {
					resource: {
						columns: {
							id: true,
							name: true,
							type: true,
							capacityUnit: true,
						},
					},
					user: {
						columns: {
							id: true,
							name: true,
						},
					},
				},
			});

			// Filter by resource type if specified
			let filteredBookings = calendarBookings;
			if (input.resourceType) {
				filteredBookings = calendarBookings.filter(
					(booking) => booking.resource.type === input.resourceType,
				);
			}

			// Transform to FullCalendar format
			return filteredBookings.map((booking) => ({
				id: booking.id,
				title: `${booking.title} (${booking.requestedQuantity}${booking.resource.capacityUnit})`,
				start: booking.startTime,
				end: booking.endTime,
				color: getResourceColor(booking.resource.id, booking.resource.name),
				extendedProps: {
					description: booking.description,
					status: booking.status,
					bookingType: booking.bookingType,
					priority: booking.priority,
					requestedQuantity: booking.requestedQuantity,
					allocatedQuantity: booking.allocatedQuantity,
					resource: booking.resource,
					user: booking.user,
					isOwner: booking.userId === ctx.session.user.id,
				},
			}));
		}),

	// Get booking statistics
	getStats: protectedProcedure
		.input(
			z.object({
				userId: z.string().optional(),
				resourceId: z.string().optional(),
				startDate: z.date().optional(),
				endDate: z.date().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});

			const isAdmin = currentUser?.role === "admin";
			const userId = input.userId || ctx.session.user.id;

			if (!isAdmin && userId !== ctx.session.user.id) {
				throw new Error("Unauthorized: Can only view own statistics");
			}

			const conditions = [eq(bookings.userId, userId)];

			if (input.resourceId) {
				conditions.push(eq(bookings.resourceId, input.resourceId));
			}

			if (input.startDate) {
				conditions.push(gte(bookings.startTime, input.startDate));
			}

			if (input.endDate) {
				conditions.push(lte(bookings.endTime, input.endDate));
			}

			const userBookings = await ctx.db.query.bookings.findMany({
				where: and(...conditions),
			});

			const stats = {
				totalBookings: userBookings.length,
				pendingBookings: userBookings.filter((b) => b.status === "pending")
					.length,
				approvedBookings: userBookings.filter((b) => b.status === "approved")
					.length,
				activeBookings: userBookings.filter((b) => b.status === "active")
					.length,
				completedBookings: userBookings.filter((b) => b.status === "completed")
					.length,
				cancelledBookings: userBookings.filter((b) => b.status === "cancelled")
					.length,
				rejectedBookings: userBookings.filter((b) => b.status === "rejected")
					.length,
				totalHours: userBookings.reduce((acc, booking) => {
					const hours =
						(booking.endTime.getTime() - booking.startTime.getTime()) /
						(1000 * 60 * 60);
					return acc + hours;
				}, 0),
			};

			return stats;
		}),

	// Check available capacity for a resource during a specific time period
	checkAvailableCapacity: protectedProcedure
		.input(
			z.object({
				resourceId: z.string(),
				startTime: z.date(),
				endTime: z.date(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Get the resource
			const resource = await ctx.db.query.resources.findFirst({
				where: eq(resources.id, input.resourceId),
			});

			if (!resource) {
				throw new Error("Resource not found");
			}

			// Get overlapping bookings to check capacity
			const overlappingBookings = await ctx.db.query.bookings.findMany({
				where: and(
					eq(bookings.resourceId, input.resourceId),
					or(
						eq(bookings.status, "approved"),
						eq(bookings.status, "active"),
						eq(bookings.status, "pending"),
					),
					// Check for actual time overlap (bookings are only conflicting if they truly overlap)
					and(
						lte(bookings.startTime, input.endTime),
						gte(bookings.endTime, input.startTime),
						// Exclude exact adjacency: booking ends exactly when new one starts, or vice versa
						not(eq(bookings.endTime, input.startTime)),
						not(eq(bookings.startTime, input.endTime)),
					),
				),
			});

			// Calculate current allocation during this time period
			const currentAllocation = overlappingBookings.reduce((total, booking) => {
				return (
					total + (booking.allocatedQuantity || booking.requestedQuantity || 0)
				);
			}, 0);

			const availableCapacity = resource.totalCapacity - currentAllocation;

			return {
				availableCapacity: Math.max(0, availableCapacity),
				totalCapacity: resource.totalCapacity,
				currentAllocation,
				conflictingBookings: overlappingBookings.length,
			};
		}),
});
