import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ResourceManagementPanel } from "./_components/resource-management-panel";

async function AdminResourcesPage() {
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
				<h1 className="font-bold text-3xl">Resource Management</h1>
				<p className="mt-2 text-muted-foreground">
					Manage computing resources, capacity, and access controls
				</p>
			</div>

			<Suspense fallback={<div>Loading resource management panel...</div>}>
				<ResourceManagementPanel />
			</Suspense>
		</div>
	);
}

export default AdminResourcesPage;
