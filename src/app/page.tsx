import Link from "next/link";

import { LatestPost } from "@/app/_components/post";
import { auth } from "@/server/auth";
import { HydrateClient, api } from "@/trpc/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
						<div className="text-center space-y-6">
							<div className="flex justify-center">
								<Badge variant="outline" className="px-3 py-1">
									🎯 Now in Beta
								</Badge>
							</div>
							<h1 className="font-extrabold text-4xl tracking-tight sm:text-6xl">
								Welcome to <span className="text-primary">OpenBook</span>
							</h1>
							<p className="mx-auto max-w-[700px] text-lg leading-8 text-muted-foreground">
								Manage and book your computing resources with ease. From GPUs to servers,
								streamline your resource allocation in academic and enterprise environments.
							</p>
						</div>

						<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-5xl">
							<Card className="relative overflow-hidden">
								<CardHeader>
									<div className="flex items-center justify-between">
										<CardTitle className="text-xl">Resource Management</CardTitle>
										<Badge variant="secondary">Core</Badge>
									</div>
								</CardHeader>
								<CardContent>
									<CardDescription className="text-base">
										Track capacity, manage availability, and optimize utilization
										of your computing infrastructure with real-time monitoring.
									</CardDescription>
								</CardContent>
							</Card>
							
							<Card className="relative overflow-hidden">
								<CardHeader>
									<div className="flex items-center justify-between">
										<CardTitle className="text-xl">Smart Booking</CardTitle>
										<Badge variant="secondary">Advanced</Badge>
									</div>
								</CardHeader>
								<CardContent>
									<CardDescription className="text-base">
										Advanced scheduling with conflict detection, capacity limits,
										and automated approval workflows for seamless reservations.
									</CardDescription>
								</CardContent>
							</Card>
							
							<Card className="relative overflow-hidden">
								<CardHeader>
									<div className="flex items-center justify-between">
										<CardTitle className="text-xl">Team Collaboration</CardTitle>
										<Badge variant="secondary">Enterprise</Badge>
									</div>
								</CardHeader>
								<CardContent>
									<CardDescription className="text-base">
										Group-based access control with roles, permissions, and
										multi-tenant resource sharing for organizations.
									</CardDescription>
								</CardContent>
							</Card>
						</div>

						{session?.user ? (
							<div className="text-center space-y-4">
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

						<Separator className="w-full max-w-md" />

						{session?.user && (
							<div className="w-full max-w-4xl">
								<LatestPost />
							</div>
						)}
					</div>
				</div>
			</main>
		</HydrateClient>
	);
}
