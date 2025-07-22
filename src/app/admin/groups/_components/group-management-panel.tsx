"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
	Filter,
	MoreHorizontal,
	Pencil,
	Plus,
	Search,
	Trash2,
	Users,
} from "lucide-react";
import { useState } from "react";
import { CreateGroupDialog } from "./create-group-dialog";
import { DeleteGroupDialog } from "./delete-group-dialog";
import { EditGroupDialog } from "./edit-group-dialog";
import { ManageUsersDialog } from "./manage-users-dialog";

interface Group {
	id: string;
	name: string;
	description?: string | null;
	isActive: boolean;
	memberCount: number;
	members: Array<{
		id: string;
		name: string | null;
		email: string;
		role: string;
	}>;
	accessibleResources: Array<{
		resource: {
			id: string;
			name: string;
			type: string;
		};
	}>;
	deniedResources: Array<{
		resource: {
			id: string;
			name: string;
			type: string;
		};
	}>;
	createdAt: Date;
	updatedAt?: Date | null;
}

export function GroupManagementPanel() {
	const [search, setSearch] = useState("");
	const [isActiveFilter, setIsActiveFilter] = useState<string>("all");
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [editingGroup, setEditingGroup] = useState<Group | null>(null);
	const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
	const [managingUsersGroup, setManagingUsersGroup] = useState<Group | null>(
		null,
	);
	const [sortBy, setSortBy] = useState<"name" | "createdAt">("name");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

	const {
		data: groups = [],
		isLoading,
		refetch,
	} = api.groups.list.useQuery({
		search: search || undefined,
		isActive:
			isActiveFilter === "all" ? undefined : isActiveFilter === "active",
		limit: 50,
		sortBy,
		sortOrder,
	});

	const handleRefresh = () => {
		void refetch();
	};

	const getStatusColor = (isActive: boolean) => {
		return isActive ? "bg-green-500" : "bg-gray-500";
	};

	const getStatusVariant = (isActive: boolean) => {
		return isActive ? "default" : "secondary";
	};

	return (
		<div className="space-y-6">
			{/* Actions Bar */}
			<div className="flex flex-col gap-4 sm:flex-row">
				<div className="flex flex-1 gap-2">
					<div className="relative flex-1">
						<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
						<Input
							placeholder="Search groups..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-10"
						/>
					</div>
					<Select value={isActiveFilter} onValueChange={setIsActiveFilter}>
						<SelectTrigger className="w-[140px]">
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Groups</SelectItem>
							<SelectItem value="active">Active</SelectItem>
							<SelectItem value="inactive">Inactive</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={handleRefresh}>
						<Filter className="mr-2 h-4 w-4" />
						Refresh
					</Button>
					<Button onClick={() => setShowCreateDialog(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Add Group
					</Button>
				</div>
			</div>

			{/* Groups Overview Cards */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="font-medium text-sm">Total Groups</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">{groups.length}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="font-medium text-sm">Active Groups</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl text-green-600">
							{groups.filter((g) => g.isActive).length}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="font-medium text-sm">Total Members</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl text-blue-600">
							{groups.reduce((sum, g) => sum + g.memberCount, 0)}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Groups Table */}
			<Card>
				<CardHeader>
					<CardTitle>Groups</CardTitle>
					<CardDescription>
						Manage user groups and their permissions
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="flex items-center justify-center py-8">
							<div className="text-muted-foreground">Loading groups...</div>
						</div>
					) : groups.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-8">
							<div className="mb-2 text-muted-foreground">No groups found</div>
							<Button onClick={() => setShowCreateDialog(true)}>
								<Plus className="mr-2 h-4 w-4" />
								Create First Group
							</Button>
						</div>
					) : (
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-[200px]">Name</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Members</TableHead>
										<TableHead>Resources</TableHead>
										<TableHead>Created</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{groups.map((group) => (
										<TableRow key={group.id}>
											<TableCell className="font-medium">
												<div className="space-y-1">
													<div>{group.name}</div>
													{group.description && (
														<div className="line-clamp-1 text-muted-foreground text-xs">
															{group.description}
														</div>
													)}
												</div>
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													<div
														className={`h-2 w-2 rounded-full ${getStatusColor(
															group.isActive,
														)}`}
													/>
													<Badge variant={getStatusVariant(group.isActive)}>
														{group.isActive ? "Active" : "Inactive"}
													</Badge>
												</div>
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													<Users className="h-4 w-4 text-muted-foreground" />
													<span>{group.memberCount}</span>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => setManagingUsersGroup(group)}
														className="ml-2 h-6 px-2 text-xs"
													>
														Manage
													</Button>
												</div>
											</TableCell>
											<TableCell>
												<div className="space-y-1">
													<div className="text-muted-foreground text-sm">
														{group.accessibleResources.length > 0 ? (
															<span className="text-green-600">
																{group.accessibleResources.length} allowed
															</span>
														) : (
															"No access rules"
														)}
													</div>
													{group.deniedResources.length > 0 && (
														<div className="text-red-600 text-xs">
															{group.deniedResources.length} denied
														</div>
													)}
												</div>
											</TableCell>
											<TableCell>
												<div className="text-muted-foreground text-sm">
													{group.createdAt.toLocaleDateString()}
												</div>
											</TableCell>
											<TableCell className="text-right">
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button variant="ghost" size="sm">
															<MoreHorizontal className="h-4 w-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem
															onClick={() => setManagingUsersGroup(group)}
														>
															<Users className="mr-2 h-4 w-4" />
															Manage Users
														</DropdownMenuItem>
														<DropdownMenuItem
															onClick={() => setEditingGroup(group)}
														>
															<Pencil className="mr-2 h-4 w-4" />
															Edit
														</DropdownMenuItem>
														<DropdownMenuItem
															onClick={() => setDeletingGroup(group)}
															className="text-destructive"
														>
															<Trash2 className="mr-2 h-4 w-4" />
															Delete
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Dialogs */}
			<CreateGroupDialog
				open={showCreateDialog}
				onOpenChange={setShowCreateDialog}
				onSuccess={handleRefresh}
			/>

			<EditGroupDialog
				open={!!editingGroup}
				onOpenChange={(open) => !open && setEditingGroup(null)}
				group={editingGroup}
				onSuccess={handleRefresh}
			/>

			<DeleteGroupDialog
				open={!!deletingGroup}
				onOpenChange={(open) => !open && setDeletingGroup(null)}
				group={deletingGroup}
				onSuccess={handleRefresh}
			/>

			<ManageUsersDialog
				open={!!managingUsersGroup}
				onOpenChange={(open) => !open && setManagingUsersGroup(null)}
				group={managingUsersGroup}
				onSuccess={handleRefresh}
			/>
		</div>
	);
}
