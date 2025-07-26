import crypto from "node:crypto";

// In-memory storage for the admin setup token
let adminSetupToken: string | null = null;
let tokenGeneratedAt: Date | null = null;

// Token expires after 24 hours
const TOKEN_EXPIRY_HOURS = 24;

export function generateAdminSetupToken(): string {
	adminSetupToken = crypto.randomBytes(32).toString("hex");
	tokenGeneratedAt = new Date();
	
	console.log("\n=== OPENBOOK ADMIN SETUP ===");
	console.log(`Admin setup token generated: ${adminSetupToken}`);
	console.log(`Token expires: ${new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()}`);
	console.log(`Setup URL: http://localhost:3000/make-admin?token=${adminSetupToken}`);
	console.log("============================\n");
	
	return adminSetupToken;
}

export function validateAdminSetupToken(token: string): boolean {
	if (!adminSetupToken || !tokenGeneratedAt) {
		return false;
	}
	
	// Check if token matches
	if (token !== adminSetupToken) {
		return false;
	}
	
	// Check if token has expired
	const expiryTime = new Date(tokenGeneratedAt.getTime() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
	if (new Date() > expiryTime) {
		console.log("Admin setup token has expired");
		adminSetupToken = null;
		tokenGeneratedAt = null;
		return false;
	}
	
	return true;
}

export function consumeAdminSetupToken(token: string): boolean {
	const isValid = validateAdminSetupToken(token);
	if (isValid) {
		// Consume the token (make it invalid after use)
		adminSetupToken = null;
		tokenGeneratedAt = null;
		console.log("Admin setup token has been consumed");
	}
	return isValid;
}

export function hasValidAdminSetupToken(): boolean {
	return adminSetupToken !== null && validateAdminSetupToken(adminSetupToken);
}