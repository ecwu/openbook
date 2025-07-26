import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { EventsPanel } from "./_components/events-panel";

async function EventsPage() {
	const session = await auth();

	if (!session?.user) {
		redirect("/");
	}

	return (
		<div className="container mx-auto py-8">
			<div className="mb-8">
				<h1 className="font-bold text-3xl">Events</h1>
				<p className="mt-2 text-muted-foreground">
					Track conference deadlines and see who's working on them
				</p>
			</div>

			<Suspense fallback={<div>Loading events...</div>}>
				<EventsPanel />
			</Suspense>
		</div>
	);
}

export default EventsPage;
