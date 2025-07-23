import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { UserDashboard } from "./_components/user-dashboard";

async function DashboardPage() {
	const session = await auth();

	if (!session?.user) {
		redirect("/");
	}

	return (
		<div className="container mx-auto py-8">
			<div className="mb-8">
				<h1 className="font-bold text-3xl">Dashboard</h1>
				<p className="mt-2 text-muted-foreground">
					Overview of your resource usage, limits, and recent activity
				</p>
			</div>

			<Suspense fallback={<div>Loading dashboard...</div>}>
				<UserDashboard />
			</Suspense>
		</div>
	);
}

export default DashboardPage;
