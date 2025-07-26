"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/trpc/react";
import { Shield, Users } from "lucide-react";
import { useState } from "react";

export function UserProfile() {
	const { toast } = useToast();
	const [isEditing, setIsEditing] = useState(false);
	const [name, setName] = useState("");

	const { data: user, isLoading } = api.users.me.useQuery();

	const updateMutation = api.users.update.useMutation({
		onSuccess: () => {
			toast({
				title: "Success",
				description: "Profile updated successfully",
			});
			setIsEditing(false);
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const handleSave = () => {
		if (!user) return;
		updateMutation.mutate({
			id: user.id,
			name: name.trim(),
		});
	};

	const handleEdit = () => {
		if (user) {
			setName(user.name || "");
		}
		setIsEditing(true);
	};

	const handleCancel = () => {
		setIsEditing(false);
		setName("");
	};

	if (isLoading) {
		return <div>Loading profile...</div>;
	}

	if (!user) {
		return <div>User not found</div>;
	}

	const isAdmin = user.role === "admin";

	return (
		<div className="space-y-6">
			{/* Profile Overview */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-3">
						<Avatar className="h-12 w-12">
							<AvatarImage
								src={user.image ?? undefined}
								alt={user.name ?? ""}
							/>
							<AvatarFallback className="text-lg">
								{user.name?.charAt(0)?.toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<div>
							<div className="flex items-center gap-2">
								<span>{user.name}</span>
								{isAdmin && (
									<Badge variant="secondary">
										<Shield className="mr-1 h-3 w-3" />
										Admin
									</Badge>
								)}
							</div>
							<p className="text-muted-foreground text-sm">{user.email}</p>
						</div>
					</CardTitle>
				</CardHeader>
			</Card>

			{/* Personal Information */}
			<Card>
				<CardHeader>
					<CardTitle>Personal Information</CardTitle>
					<CardDescription>
						Update your personal details and profile information
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="name">Name</Label>
							{isEditing ? (
								<Input
									id="name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Enter your name"
								/>
							) : (
								<div className="rounded-md border border-input bg-background px-3 py-2 text-sm">
									{user.name || "Not set"}
								</div>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<div className="rounded-md border border-input bg-muted px-3 py-2 text-muted-foreground text-sm">
								{user.email}
							</div>
						</div>
					</div>

					<div className="flex gap-2">
						{isEditing ? (
							<>
								<Button
									onClick={handleSave}
									disabled={updateMutation.isPending || !name.trim()}
								>
									{updateMutation.isPending ? "Saving..." : "Save"}
								</Button>
								<Button variant="outline" onClick={handleCancel}>
									Cancel
								</Button>
							</>
						) : (
							<Button onClick={handleEdit}>Edit Profile</Button>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Account Information */}
			<Card>
				<CardHeader>
					<CardTitle>Account Information</CardTitle>
					<CardDescription>
						View your account details and status
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Role</Label>
							<div className="flex items-center gap-2">
								<Badge variant={isAdmin ? "default" : "secondary"}>
									{isAdmin && <Shield className="mr-1 h-3 w-3" />}
									{user.role}
								</Badge>
							</div>
						</div>
						<div className="space-y-2">
							<Label>Status</Label>
							<Badge variant={user.isActive ? "default" : "destructive"}>
								{user.isActive ? "Active" : "Inactive"}
							</Badge>
						</div>
					</div>
					<div className="space-y-2">
						<Label>User ID</Label>
						<div className="rounded-md border border-input bg-muted px-3 py-2 font-mono text-sm">
							{user.id}
						</div>
					</div>
					<div className="space-y-2">
						<Label>Member Since</Label>
						<div className="rounded-md border border-input bg-muted px-3 py-2 text-sm">
							{new Date(user.createdAt).toLocaleDateString()}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Groups */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Users className="h-5 w-5" />
						Groups
					</CardTitle>
					<CardDescription>Groups you are a member of</CardDescription>
				</CardHeader>
				<CardContent>
					{user.groups && user.groups.length > 0 ? (
						<div className="flex flex-wrap gap-2">
							{user.groups.map((group) => (
								<div
									key={group.id}
									className="flex items-center gap-2 rounded-md border px-3 py-2"
									title={group.description || undefined}
								>
									<span className="font-medium text-sm">{group.name}</span>
									<Badge
										variant={group.role === "manager" ? "default" : "secondary"}
										className="text-xs"
									>
										{group.role}
									</Badge>
								</div>
							))}
						</div>
					) : (
						<p className="text-muted-foreground text-sm">
							You are not a member of any groups yet.
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
