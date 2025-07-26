import Link from "next/link";

import { LatestPost } from "@/app/_components/post";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/server/auth";
import { HydrateClient, api } from "@/trpc/server";
import { Calendar, Monitor, Users } from "lucide-react";

export default async function Home() {
	const hello = await api.post.hello({ text: "from tRPC" });
	const session = await auth();

	if (session?.user) {
		void api.post.getLatest.prefetch();
	}

	return (
		<HydrateClient>
			<main className="flex min-h-screen flex-col bg-background">
				<div className="flex flex-1 flex-col items-center justify-center">
					<div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
						<div className="space-y-6 text-center">
							<h1 className="font-extrabold text-4xl tracking-tight sm:text-6xl">
								Welcome to <span className="text-primary">OpenBook</span>
							</h1>
							<p className="mx-auto max-w-[700px] text-lg text-muted-foreground leading-8">
								Manage and book your computing resources with ease. From GPUs to
								servers, streamline your resource allocation in academic and
								enterprise environments.
							</p>
						</div>

						<div className="grid w-full max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
							<Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
								<CardHeader className="pb-4">
									<div className="flex items-center gap-3">
										<div className="rounded-lg bg-primary/10 p-2">
											<Calendar className="h-6 w-6 text-primary" />
										</div>
										<CardTitle className="text-xl">
											Book Resources
										</CardTitle>
									</div>
								</CardHeader>
								<CardContent>
									<CardDescription className="text-base">
										Reserve GPUs, servers, and computing resources for your projects. 
										Schedule time slots and manage your bookings with an intuitive calendar interface.
									</CardDescription>
								</CardContent>
							</Card>

							<Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
								<CardHeader className="pb-4">
									<div className="flex items-center gap-3">
										<div className="rounded-lg bg-primary/10 p-2">
											<Monitor className="h-6 w-6 text-primary" />
										</div>
										<CardTitle className="text-xl">Browse Resources</CardTitle>
									</div>
								</CardHeader>
								<CardContent>
									<CardDescription className="text-base">
										Explore available computing infrastructure, check capacity, 
										and find the perfect resources for your research or development needs.
									</CardDescription>
								</CardContent>
							</Card>

							<Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
								<CardHeader className="pb-4">
									<div className="flex items-center gap-3">
										<div className="rounded-lg bg-primary/10 p-2">
											<Users className="h-6 w-6 text-primary" />
										</div>
										<CardTitle className="text-xl">
											Manage Groups
										</CardTitle>
									</div>
								</CardHeader>
								<CardContent>
									<CardDescription className="text-base">
										Collaborate with your team by creating groups, sharing resources, 
										and managing access permissions for different projects and users.
									</CardDescription>
								</CardContent>
							</Card>
						</div>

						{session?.user ? (
							<div className="space-y-4 text-center">
								<p className="text-lg text-muted-foreground">
									Welcome back, {session.user.name}! 👋
								</p>
								<div className="flex flex-wrap justify-center gap-4">
									<Button asChild size="lg">
										<Link href="/dashboard">Go to Dashboard</Link>
									</Button>
									<Button asChild variant="outline" size="lg">
										<Link href="/resources">Browse Resources</Link>
									</Button>
								</div>
							</div>
						) : (
							<Card className="w-full max-w-md">
								<CardHeader className="text-center">
									<CardTitle>Get Started</CardTitle>
									<CardDescription>
										Sign in to start managing your computing resources
									</CardDescription>
								</CardHeader>
								<CardContent className="flex justify-center">
									<Button asChild size="lg" className="w-full">
										<Link href="/api/auth/signin">Sign In to OpenBook</Link>
									</Button>
								</CardContent>
							</Card>
						)}
					</div>
				</div>
			</main>
		</HydrateClient>
	);
}
