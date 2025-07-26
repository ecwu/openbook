import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ResourcesPanel } from "./_components/resources-panel";

async function ResourcesPage() {
	const session = await auth();

	if (!session?.user) {
		redirect("/");
	}

	return (
		<div className="container mx-auto py-8">
			<div className="mb-8">
				<h1 className="font-bold text-3xl">Resources</h1>
				<p className="mt-2 text-muted-foreground">
					Browse available computing resources and their current usage
				</p>
			</div>

			<Suspense fallback={<div>Loading resources...</div>}>
				<ResourcesPanel />
			</Suspense>
		</div>
	);
}

export default ResourcesPage;