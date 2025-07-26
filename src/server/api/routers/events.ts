import { and, count, desc, eq, sql } from "drizzle-orm";
import yaml from "js-yaml";
import { z } from "zod";

import {
	adminProcedure,
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "@/server/api/trpc";
import { events, eventParticipants, users } from "@/server/db/schema";

export const eventsRouter = createTRPCRouter({
	// Get all events with participant details
	getAll: publicProcedure.query(async ({ ctx }) => {
		const allEvents = await ctx.db.query.events.findMany({
			orderBy: events.deadline,
			with: {
				createdBy: {
					columns: {
						id: true,
						name: true,
					},
				},
				participants: {
					with: {
						user: {
							columns: {
								id: true,
								name: true,
								image: true,
							},
						},
					},
				},
			},
		});

		return allEvents.map((event) => ({
			id: event.id,
			name: event.name,
			description: event.description,
			deadline: event.deadline,
			createdAt: event.createdAt,
			createdBy: event.createdBy,
			participantCount: event.participants.length,
			participants: event.participants.map((p) => ({
				id: p.user.id,
				name: p.user.name,
				image: p.user.image,
			})),
		}));
	}),

	// Get upcoming events for homepage (next 5 events)
	getUpcoming: publicProcedure.query(async ({ ctx }) => {
		const now = new Date();
		const upcomingEvents = await ctx.db.query.events.findMany({
			where: sql`${events.deadline} > ${Math.floor(now.getTime() / 1000)}`,
			orderBy: events.deadline,
			limit: 5,
			with: {
				participants: {
					with: {
						user: {
							columns: {
								id: true,
								name: true,
								image: true,
							},
						},
					},
				},
			},
		});

		return upcomingEvents.map((event) => ({
			id: event.id,
			name: event.name,
			deadline: event.deadline,
			participantCount: event.participants.length,
			participants: event.participants.map((p) => ({
				id: p.user.id,
				name: p.user.name,
				image: p.user.image,
			})),
		}));
	}),

	// Get single event by ID
	getById: publicProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const event = await ctx.db.query.events.findFirst({
				where: eq(events.id, input.id),
				with: {
					createdBy: {
						columns: {
							id: true,
							name: true,
						},
					},
					participants: {
						with: {
							user: {
								columns: {
									id: true,
									name: true,
									image: true,
								},
							},
						},
					},
				},
			});

			return event;
		}),

	// Check if current user is participating in an event
	getMyParticipation: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.query(async ({ ctx, input }) => {
			const participation = await ctx.db.query.eventParticipants.findFirst({
				where: and(
					eq(eventParticipants.eventId, input.eventId),
					eq(eventParticipants.userId, ctx.session.user.id),
				),
			});

			return !!participation;
		}),

	// Get events user is participating in
	getMyEvents: protectedProcedure.query(async ({ ctx }) => {
		const userParticipations = await ctx.db.query.eventParticipants.findMany({
			where: eq(eventParticipants.userId, ctx.session.user.id),
			with: {
				event: {
					with: {
						participants: {
							with: {
								user: {
									columns: {
										id: true,
										name: true,
										image: true,
									},
								},
							},
						},
					},
				},
			},
		});

		return userParticipations.map((p) => ({
			id: p.event.id,
			name: p.event.name,
			description: p.event.description,
			deadline: p.event.deadline,
			participantCount: p.event.participants.length,
			participants: p.event.participants.map((participant) => ({
				id: participant.user.id,
				name: participant.user.name,
				image: participant.user.image,
			})),
		}));
	}),

	// Create new event
	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).max(255),
				description: z.string().optional(),
				deadline: z.date(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const event = await ctx.db
				.insert(events)
				.values({
					name: input.name,
					description: input.description,
					deadline: input.deadline,
					createdById: ctx.session.user.id,
				})
				.returning();

			return event[0];
		}),

	// Join an event
	join: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db.insert(eventParticipants).values({
				eventId: input.eventId,
				userId: ctx.session.user.id,
			});

			return { success: true };
		}),

	// Leave an event
	leave: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.delete(eventParticipants)
				.where(
					and(
						eq(eventParticipants.eventId, input.eventId),
						eq(eventParticipants.userId, ctx.session.user.id),
					),
				);

			return { success: true };
		}),

	// Admin: Batch import conferences from AI Deadlines
	batchImportConferences: adminProcedure.mutation(async ({ ctx }) => {
		try {
			// Fetch YAML data from the conferences URL
			const response = await fetch(
				"https://raw.githubusercontent.com/huggingface/ai-deadlines/refs/heads/main/src/data/conferences.yml",
			);
			if (!response.ok) {
				throw new Error(`Failed to fetch conferences: ${response.statusText}`);
			}

			const yamlText = await response.text();
			const conferences = yaml.load(yamlText) as Array<{
				title: string;
				year: number;
				id: string;
				full_name: string;
				link: string;
				deadline: string;
				abstract_deadline?: string;
				timezone: string;
				date: string;
				tags?: string[];
				country?: string;
				rankings?: string;
				venue?: string;
				hindex?: number;
				note?: string;
			}>;

			// Filter for future events only
			const now = new Date();
			const futureConferences = conferences.filter((conf) => {
				// Parse deadline considering timezone
				let deadline = new Date(conf.deadline);

				// If timezone is specified, adjust the deadline
				if (conf.timezone) {
					// Handle UTC offsets (e.g., "UTC-12", "UTC+8")
					const timezoneMatch = conf.timezone.match(/UTC([+-]\d+)/);
					if (timezoneMatch?.[1]) {
						const offsetHours = Number.parseInt(timezoneMatch[1]);
						// Adjust deadline by timezone offset
						deadline = new Date(
							deadline.getTime() - offsetHours * 60 * 60 * 1000,
						);
					}
				}

				return deadline > now;
			});

			// Create events in batch
			const eventsToCreate = futureConferences.map((conf) => {
				// Parse deadline with timezone consideration
				let deadline = new Date(conf.deadline);

				// If timezone is specified, adjust the deadline
				if (conf.timezone) {
					// Handle UTC offsets (e.g., "UTC-12", "UTC+8")
					const timezoneMatch = conf.timezone.match(/UTC([+-]\d+)/);
					if (timezoneMatch?.[1]) {
						const offsetHours = Number.parseInt(timezoneMatch[1]);
						// Adjust deadline by timezone offset
						deadline = new Date(
							deadline.getTime() - offsetHours * 60 * 60 * 1000,
						);
					}
				}

				return {
					name: `${conf.title} ${conf.year}`,
					description: `${conf.full_name}\n\nDeadline: ${conf.deadline} (${conf.timezone})\nVenue: ${conf.venue || conf.country}\nLink: ${conf.link}\n${conf.note ? `\nNote: ${conf.note.replace(/<[^>]*>/g, "")}` : ""}`,
					deadline,
					createdById: ctx.session.user.id,
				};
			});

			const createdEvents = await ctx.db
				.insert(events)
				.values(eventsToCreate)
				.returning();

			return {
				success: true,
				imported: createdEvents.length,
				total: conferences.length,
				futureEvents: futureConferences.length,
			};
		} catch (error) {
			console.error("Error importing conferences:", error);
			throw new Error(
				`Failed to import conferences: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}),

	// Admin: Batch delete all events
	batchDeleteAllEvents: adminProcedure.mutation(async ({ ctx }) => {
		try {
			// First delete all event participants
			await ctx.db.delete(eventParticipants);

			// Then delete all events
			const deletedEvents = await ctx.db.delete(events).returning();

			return {
				success: true,
				deleted: deletedEvents.length,
			};
		} catch (error) {
			console.error("Error deleting all events:", error);
			throw new Error(
				`Failed to delete events: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}),
});
