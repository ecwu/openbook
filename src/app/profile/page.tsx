import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { UserProfile } from "./_components/user-profile";

async function ProfilePage() {
	const session = await auth();

	if (!session?.user) {
		redirect("/");
	}

	return (
		<div className="container mx-auto py-8">
			<div className="mb-8">
				<h1 className="font-bold text-3xl">Profile</h1>
				<p className="mt-2 text-muted-foreground">
					Manage your profile information and account settings
				</p>
			</div>

			<Suspense fallback={<div>Loading profile...</div>}>
				<UserProfile />
			</Suspense>
		</div>
	);
}

export default ProfilePage;
