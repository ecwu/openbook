import { bookingsRouter } from "@/server/api/routers/bookings";
import { groupsRouter } from "@/server/api/routers/groups";
import { limitsRouter } from "@/server/api/routers/limits";
import { postRouter } from "@/server/api/routers/post";
import { resourcesRouter } from "@/server/api/routers/resources";
import { usersRouter } from "@/server/api/routers/users";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	post: postRouter,
	users: usersRouter,
	groups: groupsRouter,
	resources: resourcesRouter,
	bookings: bookingsRouter,
	limits: limitsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
