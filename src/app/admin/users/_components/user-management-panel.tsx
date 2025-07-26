"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { api } from "@/trpc/react";
import { ChevronDown, ChevronRight, Edit, Search, Shield, User } from "lucide-react";
import { useState } from "react";
import { EditUserDialog } from "./edit-user-dialog";

export function UserManagementPanel() {
	const [search, setSearch] = useState("");
	const [roleFilter, setRoleFilter] = useState<"admin" | "user" | undefined>();
	const [selectedUser, setSelectedUser] = useState<string | null>(null);
	const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

	const { data: users, isLoading } = api.users.list.useQuery({
		search: search || undefined,
		role: roleFilter,
		limit: 50,
	});

	const getRoleBadge = (role: string) => {
		if (role === "admin") {
			return (
				<Badge variant="default" className="gap-1">
					<Shield className="h-3 w-3" />
					Admin
				</Badge>
			);
		}
		return (
			<Badge variant="secondary" className="gap-1">
				<User className="h-3 w-3" />
				User
			</Badge>
		);
	};

	const getStatusBadge = (isActive: boolean) => {
		return (
			<Badge variant={isActive ? "default" : "destructive"}>
				{isActive ? "Active" : "Inactive"}
			</Badge>
		);
	};

	const toggleGroupsExpansion = (userId: string) => {
		const newExpanded = new Set(expandedGroups);
		if (newExpanded.has(userId)) {
			newExpanded.delete(userId);
		} else {
			newExpanded.add(userId);
		}
		setExpandedGroups(newExpanded);
	};

	const renderGroups = (user: any) => {
		const groups = user.groups || [];
		const isExpanded = expandedGroups.has(user.id);
		
		if (groups.length === 0) {
			return <span className="text-muted-foreground text-sm">No groups</span>;
		}

		if (groups.length === 1) {
			return (
				<Badge variant="outline" className="text-xs">
					{groups[0].name}
				</Badge>
			);
		}

		if (!isExpanded) {
			return (
				<div className="flex items-center gap-1">
					<Badge variant="outline" className="text-xs">
						{groups[0].name}
					</Badge>
					<Button
						variant="ghost"
						size="sm"
						className="h-6 w-6 p-0"
						onClick={() => toggleGroupsExpansion(user.id)}
					>
						<ChevronRight className="h-3 w-3" />
					</Button>
					<span className="text-muted-foreground text-xs">
						+{groups.length - 1} more
					</span>
				</div>
			);
		}

		return (
			<div className="space-y-1">
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="sm"
						className="h-6 w-6 p-0"
						onClick={() => toggleGroupsExpansion(user.id)}
					>
						<ChevronDown className="h-3 w-3" />
					</Button>
					<span className="text-muted-foreground text-xs">
						{groups.length} groups
					</span>
				</div>
				<div className="flex flex-col gap-1">
					{groups.map((group: any) => (
						<Badge key={group.id} variant="outline" className="text-xs w-fit">
							{group.name}
						</Badge>
					))}
				</div>
			</div>
		);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<User className="h-5 w-5" />
					Users
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Filters */}
				<div className="flex gap-4">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Search users by name or email..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-10"
						/>
					</div>
					<Select
						value={roleFilter || "all"}
						onValueChange={(value) =>
							setRoleFilter(value === "all" ? undefined : (value as "admin" | "user"))
						}
					>
						<SelectTrigger className="w-40">
							<SelectValue placeholder="All roles" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All roles</SelectItem>
							<SelectItem value="admin">Admin</SelectItem>
							<SelectItem value="user">User</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Users Table */}
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Groups</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={6} className="text-center py-8">
										Loading users...
									</TableCell>
								</TableRow>
							) : users?.length === 0 ? (
								<TableRow>
									<TableCell colSpan={6} className="text-center py-8">
										No users found
									</TableCell>
								</TableRow>
							) : (
								users?.map((user) => (
									<TableRow key={user.id}>
										<TableCell className="font-medium">{user.name}</TableCell>
										<TableCell>{user.email}</TableCell>
										<TableCell>{getRoleBadge(user.role)}</TableCell>
										<TableCell>{getStatusBadge(user.isActive)}</TableCell>
										<TableCell>{renderGroups(user)}</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => setSelectedUser(user.id)}
											>
												<Edit className="h-4 w-4" />
												Edit
											</Button>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>

				{/* Edit User Dialog */}
				{selectedUser && (
					<EditUserDialog
						userId={selectedUser}
						open={!!selectedUser}
						onOpenChange={(open) => !open && setSelectedUser(null)}
					/>
				)}
			</CardContent>
		</Card>
	);
}