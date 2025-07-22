import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
	bookings,
	groupResourceAccess,
	resources,
	userGroups,
	users,
} from "@/server/db/schema";
import { and, asc, desc, eq, gt, gte, ilike, inArray, lt, lte, or } from "drizzle-orm";
import { z } from "zod";

const resourceCreateSchema = z.object({
	name: z.string().min(1).max(255),
	type: z.string().min(1).max(50),
	description: z.string().optional(),
	specifications: z.record(z.any()).optional(),
	location: z.string().optional(),
	// Capacity management
	totalCapacity: z.number().int().min(1),
	capacityUnit: z.string().min(1).max(50),
	isIndivisible: z.boolean().default(false),
	minAllocation: z.number().int().min(1).optional(),
	maxAllocation: z.number().int().min(1).optional(),
	isActive: z.boolean().default(true),
});

const resourceUpdateSchema = z.object({
	id: z.string(),
	name: z.string().min(1).max(255).optional(),
	type: z.string().min(1).max(50).optional(),
	description: z.string().optional(),
	specifications: z.record(z.any()).optional(),
	status: z.enum(["available", "maintenance", "offline"]).optional(),
	location: z.string().optional(),
	// Capacity management updates
	totalCapacity: z.number().int().min(1).optional(),
	capacityUnit: z.string().min(1).max(50).optional(),
	isIndivisible: z.boolean().optional(),
	minAllocation: z.number().int().min(1).optional(),
	maxAllocation: z.number().int().min(1).optional(),
	isActive: z.boolean().optional(),
});

export const resourcesRouter = createTRPCRouter({
	// Get all resources with filtering and pagination
	list: protectedProcedure
		.input(
			z.object({
				search: z.string().optional(),
				type: z.string().optional(),
				status: z.enum(["available", "maintenance", "offline"]).optional(),
				isActive: z.boolean().optional(),
				limit: z.number().min(1).max(100).default(20),
				offset: z.number().min(0).default(0),
				sortBy: z.enum(["name", "type", "status", "createdAt"]).default("name"),
				sortOrder: z.enum(["asc", "desc"]).default("asc"),
				// Filter by user's group access
				onlyAccessible: z.boolean().default(false),
			}),
		)
		.query(async ({ ctx, input }) => {
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});

			const isAdmin = currentUser?.role === "admin";

			let whereClause = undefined;
			const conditions = [];

			if (input.search) {
				conditions.push(
					or(
						ilike(resources.name, `%${input.search}%`),
						ilike(resources.type, `%${input.search}%`),
						ilike(resources.description, `%${input.search}%`),
					),
				);
			}

			if (input.type) {
				conditions.push(eq(resources.type, input.type));
			}

			if (input.status) {
				conditions.push(eq(resources.status, input.status));
			}

			if (input.isActive !== undefined) {
				conditions.push(eq(resources.isActive, input.isActive));
			}

			if (conditions.length > 0) {
				whereClause = and(...conditions);
			}

			const orderBy =
				input.sortOrder === "asc"
					? asc(resources[input.sortBy])
					: desc(resources[input.sortBy]);

			let resourcesList = await ctx.db.query.resources.findMany({
				where: whereClause,
				limit: input.limit,
				offset: input.offset,
				orderBy,
				with: {
					groupAccess: {
						with: {
							group: true,
						},
					},
					bookings: {
						where: or(
							eq(bookings.status, "approved"),
							eq(bookings.status, "active"),
						),
						with: {
							user: {
								columns: {
									id: true,
									name: true,
								},
							},
						},
					},
				},
			});

			// If user is not admin and onlyAccessible is true, filter by group access
			if (!isAdmin && input.onlyAccessible) {
				const userGroups = await ctx.db.query.userGroups.findMany({
					where: eq(userGroups.userId, ctx.session.user.id),
				});
				const userGroupIds = userGroups.map((ug) => ug.groupId);

				resourcesList = resourcesList.filter((resource) => {
					const accessRules = resource.groupAccess;

					// If no access rules, resource is accessible
					if (accessRules.length === 0) {
						return true;
					}

					// Check if any of user's groups have access
					const userAccessRules = accessRules.filter((rule) =>
						userGroupIds.includes(rule.groupId),
					);

					if (userAccessRules.length === 0) {
						return true; // No specific rules for user's groups
					}

					// Check for explicit deny
					const hasDeny = userAccessRules.some(
						(rule) => rule.accessType === "denied",
					);
					if (hasDeny) {
						return false;
					}

					// Check for explicit allow
					const hasAllow = userAccessRules.some(
						(rule) => rule.accessType === "allowed",
					);
					return hasAllow;
				});
			}

			return resourcesList.map((resource) => {
				// Calculate current utilization
				const now = new Date();
				const currentUtilization = resource.bookings.reduce(
					(total, booking) => {
						// Only count bookings that are currently active or approved and running now
						const isCurrentlyRunning = 
							booking.status === "active" ||
							(booking.status === "approved" && 
							 booking.startTime <= now && 
							 booking.endTime > now);
							 
						if (isCurrentlyRunning) {
							return total + (booking.allocatedQuantity || booking.requestedQuantity || 0);
						}
						return total;
					},
					0,
				);

				return {
					...resource,
					currentBookings: resource.bookings,
					accessGroups: resource.groupAccess,
					currentUtilization,
					availableCapacity: resource.totalCapacity - currentUtilization,
					utilizationPercentage:
						(currentUtilization / resource.totalCapacity) * 100,
				};
			});
		}),

	// Get resource by ID with detailed info
	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});

			const resource = await ctx.db.query.resources.findFirst({
				where: eq(resources.id, input.id),
				with: {
					groupAccess: {
						with: {
							group: true,
							createdBy: {
								columns: {
									id: true,
									name: true,
								},
							},
						},
					},
					bookings: {
						orderBy: desc(bookings.startTime),
						limit: 10,
						with: {
							user: {
								columns: {
									id: true,
									name: true,
								},
							},
						},
					},
					resourceLimits: {
						with: {
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

			if (!resource) {
				throw new Error("Resource not found");
			}

			const isAdmin = currentUser?.role === "admin";

			// Check if user has access to this resource (if not admin)
			if (!isAdmin) {
				const userGroups = await ctx.db.query.userGroups.findMany({
					where: eq(userGroups.userId, ctx.session.user.id),
				});
				const userGroupIds = userGroups.map((ug) => ug.groupId);

				const accessRules = resource.groupAccess.filter((rule) =>
					userGroupIds.includes(rule.groupId),
				);

				// Check access
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

			return {
				...resource,
				recentBookings: resource.bookings,
				limits: resource.resourceLimits,
			};
		}),

	// Create new resource (admin only)
	create: protectedProcedure
		.input(resourceCreateSchema)
		.mutation(async ({ ctx, input }) => {
			// Check if user is admin
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});
			if (currentUser?.role !== "admin") {
				throw new Error("Unauthorized: Admin access required");
			}

			// Check if resource name already exists
			const existingResource = await ctx.db.query.resources.findFirst({
				where: eq(resources.name, input.name),
			});
			if (existingResource) {
				throw new Error("Resource with this name already exists");
			}

			const [newResource] = await ctx.db
				.insert(resources)
				.values(input)
				.returning();
			return newResource;
		}),

	// Update resource (admin only)
	update: protectedProcedure
		.input(resourceUpdateSchema)
		.mutation(async ({ ctx, input }) => {
			// Check if user is admin
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});
			if (currentUser?.role !== "admin") {
				throw new Error("Unauthorized: Admin access required");
			}

			// Check if new name conflicts with existing resource
			if (input.name) {
				const existingResource = await ctx.db.query.resources.findFirst({
					where: and(eq(resources.name, input.name)),
				});
				if (existingResource && existingResource.id !== input.id) {
					throw new Error("Resource with this name already exists");
				}
			}

			const updateData: any = {};
			if (input.name) updateData.name = input.name;
			if (input.type) updateData.type = input.type;
			if (input.description !== undefined)
				updateData.description = input.description;
			if (input.specifications)
				updateData.specifications = input.specifications;
			if (input.status) updateData.status = input.status;
			if (input.location !== undefined) updateData.location = input.location;
			if (input.totalCapacity) updateData.totalCapacity = input.totalCapacity;
			if (input.capacityUnit) updateData.capacityUnit = input.capacityUnit;
			if (input.isIndivisible !== undefined)
				updateData.isIndivisible = input.isIndivisible;
			if (input.minAllocation) updateData.minAllocation = input.minAllocation;
			if (input.maxAllocation) updateData.maxAllocation = input.maxAllocation;
			if (input.isActive !== undefined) updateData.isActive = input.isActive;

			const [updatedResource] = await ctx.db
				.update(resources)
				.set(updateData)
				.where(eq(resources.id, input.id))
				.returning();

			return updatedResource;
		}),

	// Get resource types (for filtering/creation)
	getTypes: protectedProcedure.query(async ({ ctx }) => {
		const types = await ctx.db
			.selectDistinct({ type: resources.type })
			.from(resources)
			.where(eq(resources.isActive, true));

		return types.map((t) => t.type);
	}),

	// Get resource availability for calendar view
	getAvailability: protectedProcedure
		.input(
			z.object({
				resourceId: z.string(),
				startDate: z.date(),
				endDate: z.date(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});

			const resource = await ctx.db.query.resources.findFirst({
				where: eq(resources.id, input.resourceId),
			});

			if (!resource) {
				throw new Error("Resource not found");
			}

			const isAdmin = currentUser?.role === "admin";

			// Check access if not admin
			if (!isAdmin) {
				const userGroups = await ctx.db.query.userGroups.findMany({
					where: eq(userGroups.userId, ctx.session.user.id),
				});
				const userGroupIds = userGroups.map((ug) => ug.groupId);

				const accessRules = await ctx.db.query.groupResourceAccess.findMany({
					where: and(eq(groupResourceAccess.resourceId, input.resourceId)),
				});

				const userAccessRules = accessRules.filter((rule) =>
					userGroupIds.includes(rule.groupId),
				);

				if (userAccessRules.length > 0) {
					const hasDeny = userAccessRules.some(
						(rule) => rule.accessType === "denied",
					);
					const hasAllow = userAccessRules.some(
						(rule) => rule.accessType === "allowed",
					);

					if (hasDeny || (!hasAllow && userAccessRules.length > 0)) {
						throw new Error("Access denied to this resource");
					}
				}
			}

			// Get bookings in the date range
			const resourceBookings = await ctx.db.query.bookings.findMany({
				where: and(
					eq(bookings.resourceId, input.resourceId),
					// Bookings that overlap with the requested date range
					or(
						and(
							eq(bookings.startTime, input.startDate),
							eq(bookings.endTime, input.endDate),
						),
						// Add more complex date overlap logic as needed
					),
				),
				with: {
					user: {
						columns: {
							id: true,
							name: true,
						},
					},
				},
			});

			// Calculate current utilization for the time period
			const currentUtilization = resourceBookings.reduce((total, booking) => {
				return (
					total + (booking.allocatedQuantity || booking.requestedQuantity || 0)
				);
			}, 0);

			return {
				resource,
				bookings: resourceBookings,
				currentUtilization,
				availableCapacity: resource.totalCapacity - currentUtilization,
				isIndivisible: resource.isIndivisible,
				capacityUnit: resource.capacityUnit,
			};
		}),

	// Get resources accessible to current user
	getAccessible: protectedProcedure.query(async ({ ctx }) => {
		const currentUser = await ctx.db.query.users.findFirst({
			where: eq(users.id, ctx.session.user.id),
		});

		const isAdmin = currentUser?.role === "admin";

		if (isAdmin) {
			// Admin can access all active resources
			return await ctx.db.query.resources.findMany({
				where: eq(resources.isActive, true),
				orderBy: asc(resources.name),
			});
		}

		// Get user's groups
		const userGroups = await ctx.db.query.userGroups.findMany({
			where: eq(userGroups.userId, ctx.session.user.id),
		});
		const userGroupIds = userGroups.map((ug) => ug.groupId);

		// Get all resources
		const allResources = await ctx.db.query.resources.findMany({
			where: eq(resources.isActive, true),
			with: {
				groupAccess: {
					where: (groupResourceAccess, { inArray }) =>
						inArray(groupResourceAccess.groupId, userGroupIds),
				},
			},
			orderBy: asc(resources.name),
		});

		// Filter based on access rules
		return allResources.filter((resource) => {
			const accessRules = resource.groupAccess;

			if (accessRules.length === 0) {
				return true; // No rules = default access
			}

			const hasDeny = accessRules.some((rule) => rule.accessType === "denied");
			if (hasDeny) {
				return false; // Explicit deny
			}

			const hasAllow = accessRules.some(
				(rule) => rule.accessType === "allowed",
			);
			return hasAllow; // Explicit allow required
		});
	}),

	// Check if specific quantity can be allocated for a time period
	checkAvailability: protectedProcedure
		.input(
			z.object({
				resourceId: z.string(),
				requestedQuantity: z.number().int().min(1),
				startTime: z.date(),
				endTime: z.date(),
				excludeBookingId: z.string().optional(), // for updates
			}),
		)
		.query(async ({ ctx, input }) => {
			const currentUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
			});

			const resource = await ctx.db.query.resources.findFirst({
				where: eq(resources.id, input.resourceId),
			});

			if (!resource) {
				throw new Error("Resource not found");
			}

			const isAdmin = currentUser?.role === "admin";

			// Check access if not admin
			if (!isAdmin) {
				const userGroups = await ctx.db.query.userGroups.findMany({
					where: eq(userGroups.userId, ctx.session.user.id),
				});
				const userGroupIds = userGroups.map((ug) => ug.groupId);

				const accessRules = await ctx.db.query.groupResourceAccess.findMany({
					where: eq(groupResourceAccess.resourceId, input.resourceId),
				});

				const userAccessRules = accessRules.filter((rule) =>
					userGroupIds.includes(rule.groupId),
				);

				if (userAccessRules.length > 0) {
					const hasDeny = userAccessRules.some(
						(rule) => rule.accessType === "denied",
					);
					const hasAllow = userAccessRules.some(
						(rule) => rule.accessType === "allowed",
					);

					if (hasDeny || (!hasAllow && userAccessRules.length > 0)) {
						throw new Error("Access denied to this resource");
					}
				}
			}

			// Get overlapping bookings
			const conditions = [
				eq(bookings.resourceId, input.resourceId),
				or(
					eq(bookings.status, "approved"),
					eq(bookings.status, "active"),
					eq(bookings.status, "pending"),
				),
				// Time overlap check
				or(
					// Booking starts during requested period
					and(
						gte(bookings.startTime, input.startTime),
						lte(bookings.startTime, input.endTime),
					),
					// Booking ends during requested period
					and(
						gte(bookings.endTime, input.startTime),
						lte(bookings.endTime, input.endTime),
					),
					// Booking completely contains requested period
					and(
						lte(bookings.startTime, input.startTime),
						gte(bookings.endTime, input.endTime),
					),
					// Requested period completely contains booking
					and(
						gte(bookings.startTime, input.startTime),
						lte(bookings.endTime, input.endTime),
					),
				),
			];

			if (input.excludeBookingId) {
				conditions.push(sql`${bookings.id} != ${input.excludeBookingId}`);
			}

			const overlappingBookings = await ctx.db.query.bookings.findMany({
				where: and(...conditions),
			});

			// Calculate current allocation during this time period
			const currentAllocation = overlappingBookings.reduce((total, booking) => {
				return (
					total + (booking.allocatedQuantity || booking.requestedQuantity || 0)
				);
			}, 0);

			const availableCapacity = resource.totalCapacity - currentAllocation;

			// Validation checks
			const validations = [];

			// Check if resource is indivisible
			if (
				resource.isIndivisible &&
				input.requestedQuantity !== resource.totalCapacity
			) {
				validations.push({
					type: "error",
					message: `Resource is indivisible and requires full allocation of ${resource.totalCapacity} ${resource.capacityUnit}`,
				});
			}

			// Check if indivisible resource has any existing bookings
			if (resource.isIndivisible && overlappingBookings.length > 0) {
				validations.push({
					type: "error",
					message:
						"Indivisible resource is already allocated during this time period",
				});
			}

			// Check minimum allocation
			if (
				resource.minAllocation &&
				input.requestedQuantity < resource.minAllocation
			) {
				validations.push({
					type: "error",
					message: `Requested quantity is below minimum allocation of ${resource.minAllocation} ${resource.capacityUnit}`,
				});
			}

			// Check maximum allocation
			if (
				resource.maxAllocation &&
				input.requestedQuantity > resource.maxAllocation
			) {
				validations.push({
					type: "error",
					message: `Requested quantity exceeds maximum allocation of ${resource.maxAllocation} ${resource.capacityUnit}`,
				});
			}

			// Check available capacity
			if (input.requestedQuantity > availableCapacity) {
				validations.push({
					type: "error",
					message: `Insufficient capacity. Available: ${availableCapacity} ${resource.capacityUnit}, Requested: ${input.requestedQuantity} ${resource.capacityUnit}`,
				});
			}

			const isAvailable =
				validations.filter((v) => v.type === "error").length === 0;

			return {
				isAvailable,
				availableCapacity,
				currentAllocation,
				totalCapacity: resource.totalCapacity,
				capacityUnit: resource.capacityUnit,
				isIndivisible: resource.isIndivisible,
				minAllocation: resource.minAllocation,
				maxAllocation: resource.maxAllocation,
				validations,
				overlappingBookings: overlappingBookings.map((b) => ({
					id: b.id,
					title: b.title,
					startTime: b.startTime,
					endTime: b.endTime,
					requestedQuantity: b.requestedQuantity,
					allocatedQuantity: b.allocatedQuantity,
					status: b.status,
				})),
			};
		}),

	// Get 24-hour usage prediction for resources
	get24HourUsagePrediction: protectedProcedure
		.input(
			z.object({
				resourceId: z.string().optional(),
			})
		)
		.query(async ({ ctx, input }) => {
			const now = new Date();
			const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

			// First, get all active resources
			const resourceFilter = input.resourceId 
				? and(eq(resources.id, input.resourceId), eq(resources.isActive, true))
				: eq(resources.isActive, true);

			const resourcesList = await ctx.db
				.select()
				.from(resources)
				.where(resourceFilter)
				.orderBy(asc(resources.name));

			if (resourcesList.length === 0) {
				return [];
			}

			// Get all relevant bookings for these resources
			const resourceIds = resourcesList.map(r => r.id);
			const relevantBookings = await ctx.db
				.select()
				.from(bookings)
				.where(
					and(
						inArray(bookings.resourceId, resourceIds),
						or(
							eq(bookings.status, "approved"),
							eq(bookings.status, "active"),
						),
						// Only get bookings that overlap with next 24 hours
						bookings.startTime < next24Hours,
						bookings.endTime > now
					)
				);

			// Group bookings by resource
			const resourceBookingsMap = new Map();
			
			// Initialize all resources with empty booking arrays
			for (const resource of resourcesList) {
				resourceBookingsMap.set(resource.id, {
					resource,
					bookings: []
				});
			}
			
			// Add bookings to their respective resources
			for (const booking of relevantBookings) {
				const resourceData = resourceBookingsMap.get(booking.resourceId);
				if (resourceData) {
					resourceData.bookings.push(booking);
				}
			}

			// Generate hourly usage data for each resource
			const predictions = Array.from(resourceBookingsMap.values()).map(({ resource, bookings }) => {
				const hourlyData = [];
				
				// Generate data points for each hour in the next 24 hours
				for (let hour = 0; hour < 24; hour++) {
					const hourStart = new Date(now.getTime() + hour * 60 * 60 * 1000);
					const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
					
					// Calculate usage for this hour
					const usage = bookings.reduce((total, booking) => {
						// Check if booking overlaps with this hour
						if (booking.startTime < hourEnd && booking.endTime > hourStart) {
							return total + (booking.allocatedQuantity || booking.requestedQuantity || 0);
						}
						return total;
					}, 0);

					const utilizationPercent = resource.totalCapacity > 0 
						? Math.round((usage / resource.totalCapacity) * 100) 
						: 0;

					hourlyData.push({
						hour: hourStart.toISOString(),
						hourLabel: hourStart.toLocaleTimeString('en-US', { 
							hour: '2-digit', 
							minute: '2-digit',
							hour12: false 
						}),
						usage,
						totalCapacity: resource.totalCapacity,
						utilizationPercent,
						availableCapacity: resource.totalCapacity - usage,
					});
				}

				return {
					resourceId: resource.id,
					resourceName: resource.name,
					resourceType: resource.type,
					totalCapacity: resource.totalCapacity,
					capacityUnit: resource.capacityUnit,
					hourlyData,
				};
			});

			return predictions;
		}),
});
