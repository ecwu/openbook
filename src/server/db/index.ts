import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { env } from "@/env";
import * as schema from "./schema";
import { generateAdminSetupToken } from "../admin-token";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
	conn: Database.Database | undefined;
};

const conn = globalForDb.conn ?? new Database(env.DATABASE_URL);
if (env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });

// Check for admin users and generate setup token if needed
async function checkAdminSetup() {
	try {
		// Simple count query to avoid TypeScript issues
		const result = await conn.prepare("SELECT COUNT(*) as count FROM openbook_user WHERE role = ?").get("admin") as { count: number };
		
		if (result.count === 0) {
			generateAdminSetupToken();
		}
	} catch (error) {
		// Ignore errors during startup (table might not exist yet)
		console.log("Database not ready for admin check, skipping token generation");
	}
}

// Run admin setup check after a short delay to ensure database is ready
setTimeout(checkAdminSetup, 1000);
