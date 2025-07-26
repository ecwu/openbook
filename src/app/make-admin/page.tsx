"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/trpc/react";
import { Shield, AlertCircle, CheckCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function MakeAdminContent() {
	const { data: session, status, update } = useSession();
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get("token");
	const { toast } = useToast();
	const [isProcessing, setIsProcessing] = useState(false);
	const [isComplete, setIsComplete] = useState(false);

	const makeAdminMutation = api.users.makeAdminWithToken.useMutation({
		onSuccess: async () => {
			setIsComplete(true);
			toast({
				title: "Success!",
				description: "You have been granted admin privileges.",
			});
			
			// Update the session to reflect the new role
			await update();
			
			// Redirect to admin panel after a short delay
			setTimeout(() => {
				router.push("/admin/resources");
			}, 2000);
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			});
			setIsProcessing(false);
		},
	});

	const handleMakeAdmin = () => {
		if (!token) {
			toast({
				title: "Error",
				description: "No admin setup token provided",
				variant: "destructive",
			});
			return;
		}

		if (!session?.user?.id) {
			toast({
				title: "Error",
				description: "You must be signed in to become an admin",
				variant: "destructive",
			});
			return;
		}

		setIsProcessing(true);
		makeAdminMutation.mutate({ token });
	};

	// Redirect if no token provided
	useEffect(() => {
		if (!token) {
			router.push("/");
		}
	}, [token, router]);

	// Redirect if already admin
	useEffect(() => {
		if (session?.user?.role === "admin") {
			router.push("/admin/resources");
		}
	}, [session, router]);

	if (status === "loading") {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
					<p className="mt-2">Loading...</p>
				</div>
			</div>
		);
	}

	if (status === "unauthenticated") {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle className="flex items-center justify-center gap-2">
							<AlertCircle className="h-5 w-5 text-orange-500" />
							Authentication Required
						</CardTitle>
						<CardDescription>
							You must be signed in to set up admin access
						</CardDescription>
					</CardHeader>
					<CardContent className="text-center">
						<p className="mb-4 text-sm text-muted-foreground">
							Please sign in with your account first, then return to this page.
						</p>
						<Button onClick={() => router.push("/api/auth/signin")}>
							Sign In
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!token) {
		return null; // Will redirect
	}

	if (isComplete) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle className="flex items-center justify-center gap-2">
							<CheckCircle className="h-5 w-5 text-green-500" />
							Admin Setup Complete
						</CardTitle>
						<CardDescription>
							You are now an administrator
						</CardDescription>
					</CardHeader>
					<CardContent className="text-center">
						<p className="mb-4 text-sm text-muted-foreground">
							Redirecting to admin panel...
						</p>
						<div className="h-4 w-4 animate-spin rounded-full border-b-2 border-gray-900 mx-auto"></div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="flex items-center justify-center gap-2">
						<Shield className="h-5 w-5 text-blue-500" />
						OpenBook Admin Setup
					</CardTitle>
					<CardDescription>
						Set up your administrator account
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<p className="text-sm">
							<strong>User:</strong> {session?.user?.name || session?.user?.email}
						</p>
						<p className="text-sm text-muted-foreground">
							You are about to become an administrator for this OpenBook instance. 
							This will grant you full access to manage users, resources, groups, and system settings.
						</p>
					</div>
					
					<div className="rounded-lg bg-orange-50 p-3 border border-orange-200">
						<p className="text-sm text-orange-800">
							<strong>Note:</strong> Admin setup tokens can only be used once and expire after 24 hours.
						</p>
					</div>

					<Button 
						onClick={handleMakeAdmin}
						disabled={isProcessing}
						className="w-full"
					>
						{isProcessing ? (
							<>
								<div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
								Setting up admin access...
							</>
						) : (
							<>
								<Shield className="mr-2 h-4 w-4" />
								Become Administrator
							</>
						)}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}

export default function MakeAdminPage() {
	return (
		<Suspense fallback={
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full border-b-2 border-gray-900 h-8 w-8" />
					<p className="mt-2">Loading...</p>
				</div>
			</div>
		}>
			<MakeAdminContent />
		</Suspense>
	);
}