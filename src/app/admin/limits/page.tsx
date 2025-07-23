import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LimitManagementPanel } from "./_components/limit-management-panel";

async function LimitsAdminPage() {
	const session = await auth();

	if (!session?.user) {
		redirect("/");
	}

	// Check if user is admin (this will be double-checked on the API level)
	if (session.user.role !== "admin") {
		redirect("/");
	}

	return (
		<div className="container mx-auto py-8">
			<div className="mb-8">
				<h1 className="font-bold text-3xl">Resource Limits Management</h1>
				<p className="mt-2 text-muted-foreground">
					Configure and manage resource usage limits for users, groups, and
					resources
				</p>
			</div>

			<Suspense fallback={<div>Loading limit management panel...</div>}>
				<LimitManagementPanel />
			</Suspense>
		</div>
	);
}

export default LimitsAdminPage;
