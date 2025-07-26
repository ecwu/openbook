import { relations, sql } from "drizzle-orm";
import { index, primaryKey, sqliteTableCreator } from "drizzle-orm/sqlite-core";
import type { AdapterAccount } from "next-auth/adapters";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = sqliteTableCreator((name) => `openbook_${name}`);

export const posts = createTable(
	"post",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		name: d.text({ length: 256 }),
		createdById: d
			.text({ length: 255 })
			.notNull()
			.references(() => users.id),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
		updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
	}),
	(t) => [
		index("created_by_idx").on(t.createdById),
		index("name_idx").on(t.name),
	],
);

export const users = createTable("user", (d) => ({
	id: d
		.text({ length: 255 })
		.notNull()
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: d.text({ length: 255 }),
	email: d.text({ length: 255 }).notNull(),
	emailVerified: d
		.integer({
			mode: "timestamp",
		})
		.default(sql`(unixepoch())`),
	image: d.text({ length: 255 }),
	role: d.text({ length: 20 }).notNull().default("user"), // admin, user
	isActive: d.integer({ mode: "boolean" }).notNull().default(true),
	createdAt: d
		.integer({ mode: "timestamp" })
		.default(sql`(unixepoch())`)
		.notNull(),
	updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));

export const usersRelations = relations(users, ({ many }) => ({
	accounts: many(accounts),
	userGroups: many(userGroups),
	bookings: many(bookings),
	resourceLimits: many(resourceLimits),
	createdEvents: many(events),
	eventParticipations: many(eventParticipants),
}));

export const accounts = createTable(
	"account",
	(d) => ({
		userId: d
			.text({ length: 255 })
			.notNull()
			.references(() => users.id),
		type: d.text({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
		provider: d.text({ length: 255 }).notNull(),
		providerAccountId: d.text({ length: 255 }).notNull(),
		refresh_token: d.text(),
		access_token: d.text(),
		expires_at: d.integer(),
		token_type: d.text({ length: 255 }),
		scope: d.text({ length: 255 }),
		id_token: d.text(),
		session_state: d.text({ length: 255 }),
	}),
	(t) => [
		primaryKey({ columns: [t.provider, t.providerAccountId] }),
		index("account_user_id_idx").on(t.userId),
	],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
	"session",
	(d) => ({
		sessionToken: d.text({ length: 255 }).notNull().primaryKey(),
		userId: d
			.text({ length: 255 })
			.notNull()
			.references(() => users.id),
		expires: d.integer({ mode: "timestamp" }).notNull(),
	}),
	(t) => [index("t_user_id_idx").on(t.userId)],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
	"verification_token",
	(d) => ({
		identifier: d.text({ length: 255 }).notNull(),
		token: d.text({ length: 255 }).notNull(),
		expires: d.integer({ mode: "timestamp" }).notNull(),
	}),
	(t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// Groups table for organizing users
export const groups = createTable(
	"group",
	(d) => ({
		id: d
			.text({ length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: d.text({ length: 255 }).notNull(),
		description: d.text(),
		isActive: d.integer({ mode: "boolean" }).notNull().default(true),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
		updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
	}),
	(t) => [index("group_name_idx").on(t.name)],
);

// Junction table for users and groups (many-to-many)
export const userGroups = createTable(
	"user_group",
	(d) => ({
		userId: d
			.text({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		groupId: d
			.text({ length: 255 })
			.notNull()
			.references(() => groups.id, { onDelete: "cascade" }),
		role: d.text({ length: 20 }).notNull().default("member"), // member, manager
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
	}),
	(t) => [
		primaryKey({ columns: [t.userId, t.groupId] }),
		index("user_group_user_idx").on(t.userId),
		index("user_group_group_idx").on(t.groupId),
	],
);

// Resources table (GPU cards, servers, etc.)
export const resources = createTable(
	"resource",
	(d) => ({
		id: d
			.text({ length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: d.text({ length: 255 }).notNull(),
		type: d.text({ length: 50 }).notNull(), // gpu, cpu, storage, etc.
		description: d.text(),
		specifications: d.text({ mode: "json" }), // JSON field for flexible specs
		status: d.text({ length: 20 }).notNull().default("available"), // available, maintenance, offline
		location: d.text({ length: 255 }), // physical location or server identifier
		// Resource capacity management
		totalCapacity: d.integer().notNull(), // total amount available
		capacityUnit: d.text({ length: 50 }).notNull(), // GB, cores, instances, etc.
		isIndivisible: d.integer({ mode: "boolean" }).notNull().default(false), // if true, must allocate entire capacity
		minAllocation: d.integer(), // minimum allocation unit
		maxAllocation: d.integer(), // maximum allocation per booking
		isActive: d.integer({ mode: "boolean" }).notNull().default(true),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
		updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
	}),
	(t) => [
		index("resource_name_idx").on(t.name),
		index("resource_type_idx").on(t.type),
		index("resource_status_idx").on(t.status),
		index("resource_indivisible_idx").on(t.isIndivisible),
	],
);

// Group resource access control (whitelist/blacklist model)
export const groupResourceAccess = createTable(
	"group_resource_access",
	(d) => ({
		groupId: d
			.text({ length: 255 })
			.notNull()
			.references(() => groups.id, { onDelete: "cascade" }),
		resourceId: d
			.text({ length: 255 })
			.notNull()
			.references(() => resources.id, { onDelete: "cascade" }),
		accessType: d.text({ length: 10 }).notNull(), // allowed, denied
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
		createdById: d
			.text({ length: 255 })
			.notNull()
			.references(() => users.id),
	}),
	(t) => [
		primaryKey({ columns: [t.groupId, t.resourceId] }),
		index("group_resource_group_idx").on(t.groupId),
		index("group_resource_resource_idx").on(t.resourceId),
	],
);

// Bookings/reservations table
export const bookings = createTable(
	"booking",
	(d) => ({
		id: d
			.text({ length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: d
			.text({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		resourceId: d
			.text({ length: 255 })
			.notNull()
			.references(() => resources.id, { onDelete: "cascade" }),
		title: d.text({ length: 255 }).notNull(),
		description: d.text(),
		startTime: d.integer({ mode: "timestamp" }).notNull(),
		endTime: d.integer({ mode: "timestamp" }).notNull(),
		// Resource allocation
		requestedQuantity: d.integer().notNull(), // amount requested
		allocatedQuantity: d.integer(), // amount actually allocated (may differ for shared resources)
		bookingType: d.text({ length: 20 }).notNull(), // shared, exclusive
		status: d.text({ length: 20 }).notNull().default("pending"), // pending, approved, active, completed, cancelled, rejected
		priority: d.text({ length: 10 }).notNull().default("normal"), // low, normal, high, critical
		approvedById: d.text({ length: 255 }).references(() => users.id),
		approvedAt: d.integer({ mode: "timestamp" }),
		rejectionReason: d.text(),
		actualStartTime: d.integer({ mode: "timestamp" }),
		actualEndTime: d.integer({ mode: "timestamp" }),
		metadata: d.text({ mode: "json" }), // additional data for the booking
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
		updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
	}),
	(t) => [
		index("booking_user_idx").on(t.userId),
		index("booking_resource_idx").on(t.resourceId),
		index("booking_status_idx").on(t.status),
		index("booking_time_idx").on(t.startTime, t.endTime),
		index("booking_resource_time_idx").on(t.resourceId, t.startTime, t.endTime),
		index("booking_quantity_idx").on(t.requestedQuantity),
	],
);

// Resource limits table (supports multiple limit types)
export const resourceLimits = createTable(
	"resource_limit",
	(d) => ({
		id: d
			.text({ length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: d.text({ length: 255 }).notNull(),
		description: d.text(),
		limitType: d.text({ length: 20 }).notNull().default("user"), // only "user" type now
		targetId: d.text({ length: 255 }).notNull(), // userId only now
		resourceId: d
			.text({ length: 255 })
			.references(() => resources.id, { onDelete: "cascade" }), // null for global limits
		// Time-based limits
		maxHoursPerDay: d.integer(), // null for no limit
		maxHoursPerWeek: d.integer(),
		maxHoursPerMonth: d.integer(),
		// Concurrent booking limits
		maxConcurrentBookings: d.integer(),
		maxBookingsPerDay: d.integer(),
		// Advanced limits
		allowedBookingTypes: d.text({ mode: "json" }), // ["shared", "exclusive"] or restrictions
		allowedTimeSlots: d.text({ mode: "json" }), // time restrictions (business hours, etc.)
		priority: d.integer().notNull().default(0), // higher number = higher priority for limit resolution
		isActive: d.integer({ mode: "boolean" }).notNull().default(true),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
		updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
		createdById: d
			.text({ length: 255 })
			.notNull()
			.references(() => users.id),
	}),
	(t) => [
		index("limit_type_target_idx").on(t.limitType, t.targetId),
		index("limit_resource_idx").on(t.resourceId),
		index("limit_target_idx").on(t.targetId),
	],
);

// Relations
export const groupsRelations = relations(groups, ({ many }) => ({
	userGroups: many(userGroups),
	resourceAccess: many(groupResourceAccess),
	resourceLimits: many(resourceLimits),
}));

export const userGroupsRelations = relations(userGroups, ({ one }) => ({
	user: one(users, { fields: [userGroups.userId], references: [users.id] }),
	group: one(groups, { fields: [userGroups.groupId], references: [groups.id] }),
}));

export const resourcesRelations = relations(resources, ({ many }) => ({
	groupAccess: many(groupResourceAccess),
	bookings: many(bookings),
	resourceLimits: many(resourceLimits),
}));

export const groupResourceAccessRelations = relations(
	groupResourceAccess,
	({ one }) => ({
		group: one(groups, {
			fields: [groupResourceAccess.groupId],
			references: [groups.id],
		}),
		resource: one(resources, {
			fields: [groupResourceAccess.resourceId],
			references: [resources.id],
		}),
		createdBy: one(users, {
			fields: [groupResourceAccess.createdById],
			references: [users.id],
		}),
	}),
);

export const bookingsRelations = relations(bookings, ({ one }) => ({
	user: one(users, { fields: [bookings.userId], references: [users.id] }),
	resource: one(resources, {
		fields: [bookings.resourceId],
		references: [resources.id],
	}),
	approvedBy: one(users, {
		fields: [bookings.approvedById],
		references: [users.id],
	}),
}));

export const resourceLimitsRelations = relations(resourceLimits, ({ one }) => ({
	resource: one(resources, {
		fields: [resourceLimits.resourceId],
		references: [resources.id],
	}),
	createdBy: one(users, {
		fields: [resourceLimits.createdById],
		references: [users.id],
	}),
}));

// Events table for deadline tracking
export const events = createTable(
	"event",
	(d) => ({
		id: d
			.text({ length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: d.text({ length: 255 }).notNull(),
		description: d.text(),
		deadline: d.integer({ mode: "timestamp" }).notNull(),
		createdById: d
			.text({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
		updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
	}),
	(t) => [
		index("event_deadline_idx").on(t.deadline),
		index("event_creator_idx").on(t.createdById),
	],
);

// Event participants - simple join/leave tracking
export const eventParticipants = createTable(
	"event_participant",
	(d) => ({
		eventId: d
			.text({ length: 255 })
			.notNull()
			.references(() => events.id, { onDelete: "cascade" }),
		userId: d
			.text({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		joinedAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
	}),
	(t) => [primaryKey({ columns: [t.eventId, t.userId] })],
);

// Relations for events
export const eventsRelations = relations(events, ({ one, many }) => ({
	createdBy: one(users, {
		fields: [events.createdById],
		references: [users.id],
	}),
	participants: many(eventParticipants),
}));

export const eventParticipantsRelations = relations(
	eventParticipants,
	({ one }) => ({
		event: one(events, {
			fields: [eventParticipants.eventId],
			references: [events.id],
		}),
		user: one(users, {
			fields: [eventParticipants.userId],
			references: [users.id],
		}),
	}),
);
