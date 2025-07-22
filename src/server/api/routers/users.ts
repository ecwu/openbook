import { z } from "zod";
import { eq, and, desc, asc, ilike, or } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { users, userGroups, groups, resourceLimits } from "@/server/db/schema";

const userCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  role: z.enum(["admin", "user"]).default("user"),
  isActive: z.boolean().default(true),
});

const userUpdateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  role: z.enum(["admin", "user"]).optional(),
  isActive: z.boolean().optional(),
});

export const usersRouter = createTRPCRouter({
  // Get all users with filtering and pagination
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      role: z.enum(["admin", "user"]).optional(),
      isActive: z.boolean().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
      sortBy: z.enum(["name", "email", "role", "createdAt"]).default("name"),
      sortOrder: z.enum(["asc", "desc"]).default("asc"),
    }))
    .query(async ({ ctx, input }) => {
      // Check if user is admin
      if (ctx.session.user.id) {
        const currentUser = await ctx.db.query.users.findFirst({
          where: eq(users.id, ctx.session.user.id),
        });
        if (currentUser?.role !== "admin") {
          throw new Error("Unauthorized: Admin access required");
        }
      }

      let whereClause = undefined;
      if (input.search || input.role !== undefined || input.isActive !== undefined) {
        const conditions = [];
        
        if (input.search) {
          conditions.push(
            or(
              ilike(users.name, `%${input.search}%`),
              ilike(users.email, `%${input.search}%`)
            )
          );
        }
        
        if (input.role) {
          conditions.push(eq(users.role, input.role));
        }
        
        if (input.isActive !== undefined) {
          conditions.push(eq(users.isActive, input.isActive));
        }
        
        whereClause = and(...conditions);
      }

      const orderBy = input.sortOrder === "asc" 
        ? asc(users[input.sortBy]) 
        : desc(users[input.sortBy]);

      const usersList = await ctx.db.query.users.findMany({
        where: whereClause,
        limit: input.limit,
        offset: input.offset,
        orderBy,
        with: {
          userGroups: {
            with: {
              group: true,
            },
          },
        },
      });

      return usersList.map(user => ({
        ...user,
        groups: user.userGroups.map(ug => ug.group),
      }));
    }),

  // Get user by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Users can only get their own info unless they're admin
      const currentUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
      });

      if (currentUser?.role !== "admin" && ctx.session.user.id !== input.id) {
        throw new Error("Unauthorized: Can only access own user data");
      }

      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.id),
        with: {
          userGroups: {
            with: {
              group: true,
            },
          },
          resourceLimits: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return {
        ...user,
        groups: user.userGroups.map(ug => ({
          ...ug.group,
          role: ug.role,
        })),
      };
    }),

  // Create new user (admin only)
  create: protectedProcedure
    .input(userCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      const currentUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
      });
      if (currentUser?.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      // Check if email already exists
      const existingUser = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email),
      });
      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      const [newUser] = await ctx.db.insert(users).values(input).returning();
      return newUser;
    }),

  // Update user (admin only, or users updating themselves with restrictions)
  update: protectedProcedure
    .input(userUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const currentUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
      });

      const isAdmin = currentUser?.role === "admin";
      const isSelf = ctx.session.user.id === input.id;

      if (!isAdmin && !isSelf) {
        throw new Error("Unauthorized: Can only update own profile");
      }

      // Non-admins can't update role or isActive
      if (!isAdmin && (input.role !== undefined || input.isActive !== undefined)) {
        throw new Error("Unauthorized: Cannot update role or status");
      }

      const [updatedUser] = await ctx.db
        .update(users)
        .set({
          ...(input.name && { name: input.name }),
          ...(input.role && { role: input.role }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        })
        .where(eq(users.id, input.id))
        .returning();

      return updatedUser;
    }),

  // Add user to group (admin only)
  addToGroup: protectedProcedure
    .input(z.object({
      userId: z.string(),
      groupId: z.string(),
      role: z.enum(["member", "manager"]).default("member"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      const currentUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
      });
      if (currentUser?.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      // Check if user and group exist
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId),
      });
      const group = await ctx.db.query.groups.findFirst({
        where: eq(groups.id, input.groupId),
      });

      if (!user || !group) {
        throw new Error("User or group not found");
      }

      // Check if user is already in group
      const existing = await ctx.db.query.userGroups.findFirst({
        where: and(
          eq(userGroups.userId, input.userId),
          eq(userGroups.groupId, input.groupId)
        ),
      });

      if (existing) {
        throw new Error("User is already a member of this group");
      }

      const [newMembership] = await ctx.db.insert(userGroups).values(input).returning();
      return newMembership;
    }),

  // Remove user from group (admin only)
  removeFromGroup: protectedProcedure
    .input(z.object({
      userId: z.string(),
      groupId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      const currentUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
      });
      if (currentUser?.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      await ctx.db
        .delete(userGroups)
        .where(
          and(
            eq(userGroups.userId, input.userId),
            eq(userGroups.groupId, input.groupId)
          )
        );

      return { success: true };
    }),

  // Deactivate user (admin only)
  deactivate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      const currentUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
      });
      if (currentUser?.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      const [deactivatedUser] = await ctx.db
        .update(users)
        .set({ isActive: false })
        .where(eq(users.id, input.id))
        .returning();

      return deactivatedUser;
    }),

  // Get current user profile
  me: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
        with: {
          userGroups: {
            with: {
              group: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return {
        ...user,
        groups: user.userGroups.map(ug => ({
          ...ug.group,
          role: ug.role,
        })),
      };
    }),
});