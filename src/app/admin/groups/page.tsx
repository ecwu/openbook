import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { GroupManagementPanel } from "./_components/group-management-panel";

async function GroupsAdminPage() {
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
				<h1 className="font-bold text-3xl">Group Management</h1>
				<p className="mt-2 text-muted-foreground">
					Manage user groups, members, and resource access permissions
				</p>
			</div>

			<Suspense fallback={<div>Loading group management panel...</div>}>
				<GroupManagementPanel />
			</Suspense>
		</div>
	);
}

export default GroupsAdminPage;
