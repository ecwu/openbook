import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	/**
	 * Specify your server-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars.
	 */
	server: {
		AUTH_SECRET:
			process.env.NODE_ENV === "production"
				? z.string()
				: z.string().optional(),

		AUTH_AUTHENTIK_ID: z.string().optional(),
		AUTH_AUTHENTIK_SECRET: z.string().optional(),
		AUTH_AUTHENTIK_ISSUER: z.string().optional(),
		DATABASE_URL: z.string(),
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),

		// System-wide default resource limits (required)
		DEFAULT_MAX_HOURS_PER_DAY: z.coerce.number().int().min(0).default(24),
		DEFAULT_MAX_HOURS_PER_WEEK: z.coerce.number().int().min(0).default(40),
		DEFAULT_MAX_HOURS_PER_MONTH: z.coerce.number().int().min(0).default(120),
	},

	/**
	 * Specify your client-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars. To expose them to the client, prefix them with
	 * `NEXT_PUBLIC_`.
	 */
	client: {
		// NEXT_PUBLIC_CLIENTVAR: z.string(),
	},

	/**
	 * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
	 * middlewares) or client-side so we need to destruct manually.
	 */
	runtimeEnv: {
		AUTH_SECRET: process.env.AUTH_SECRET,
		AUTH_AUTHENTIK_ID: process.env.AUTH_AUTHENTIK_ID,
		AUTH_AUTHENTIK_SECRET: process.env.AUTH_AUTHENTIK_SECRET,
		AUTH_AUTHENTIK_ISSUER: process.env.AUTH_AUTHENTIK_ISSUER,
		DATABASE_URL: process.env.DATABASE_URL,
		NODE_ENV: process.env.NODE_ENV,
		DEFAULT_MAX_HOURS_PER_DAY: process.env.DEFAULT_MAX_HOURS_PER_DAY,
		DEFAULT_MAX_HOURS_PER_WEEK: process.env.DEFAULT_MAX_HOURS_PER_WEEK,
		DEFAULT_MAX_HOURS_PER_MONTH: process.env.DEFAULT_MAX_HOURS_PER_MONTH,
	},
	/**
	 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
	 * useful for Docker builds.
	 */
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	/**
	 * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
	 * `SOME_VAR=''` will throw an error.
	 */
	emptyStringAsUndefined: true,
});
