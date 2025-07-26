import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { EventManagementPanel } from "./_components/event-management-panel";

async function AdminEventsPage() {
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
				<h1 className="font-bold text-3xl">Event Management</h1>
				<p className="mt-2 text-muted-foreground">
					Manage events and batch import conferences from AI Deadlines
				</p>
			</div>

			<Suspense fallback={<div>Loading event management panel...</div>}>
				<EventManagementPanel />
			</Suspense>
		</div>
	);
}

export default AdminEventsPage;