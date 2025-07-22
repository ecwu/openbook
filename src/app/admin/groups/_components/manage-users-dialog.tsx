"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { api } from "@/trpc/react";
import {
	MoreHorizontal,
	Plus,
	Search,
	Trash2,
	UserMinus,
	Users,
} from "lucide-react";
import { useState } from "react";

interface Group {
	id: string;
	name: string;
	description?: string | null;
	memberCount: number;
	members: Array<{
		id: string;
		name: string | null;
		email: string;
		role: string;
	}>;
}

interface ManageUsersDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	group: Group | null;
	onSuccess: () => void;
}

interface AddUserFormState {
	selectedUserId: string;
	selectedRole: "member" | "manager";
}

export function ManageUsersDialog({
	open,
	onOpenChange,
	group,
	onSuccess,
}: ManageUsersDialogProps) {
	const { toast } = useToast();
	const [userSearch, setUserSearch] = useState("");
	const [showAddForm, setShowAddForm] = useState(false);
	const [addUserForm, setAddUserForm] = useState<AddUserFormState>({
		selectedUserId: "",
		selectedRole: "member",
	});

	// Get all users to add to group
	const { data: allUsers = [] } = api.users.list.useQuery({
		search: userSearch || undefined,
		limit: 50,
	});

	// Filter users who are not already in the group
	const availableUsers = allUsers.filter(
		(user) => !group?.members.some((member) => member.id === user.id),
	);

	const addToGroupMutation = api.users.addToGroup.useMutation({
		onSuccess: () => {
			toast({
				title: "Success",
				description: "User added to group successfully",
			});
			onSuccess();
			setShowAddForm(false);
			setAddUserForm({ selectedUserId: "", selectedRole: "member" });
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message || "Failed to add user to group",
				variant: "destructive",
			});
		},
	});

	const removeFromGroupMutation = api.users.removeFromGroup.useMutation({
		onSuccess: () => {
			toast({
				title: "Success",
				description: "User removed from group successfully",
			});
			onSuccess();
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message || "Failed to remove user from group",
				variant: "destructive",
			});
		},
	});

	const handleAddUser = () => {
		if (!group || !addUserForm.selectedUserId) return;

		addToGroupMutation.mutate({
			userId: addUserForm.selectedUserId,
			groupId: group.id,
			role: addUserForm.selectedRole,
		});
	};

	const handleRemoveUser = (userId: string) => {
		if (!group) return;

		removeFromGroupMutation.mutate({
			userId,
			groupId: group.id,
		});
	};

	const getRoleBadgeVariant = (role: string) => {
		switch (role) {
			case "manager":
				return "default";
			case "member":
				return "secondary";
			default:
				return "outline";
		}
	};

	if (!group) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Users className="h-5 w-5" />
						Manage Users - {group.name}
					</DialogTitle>
					<DialogDescription>
						Add or remove users from this group and manage their roles.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Add User Section */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h4 className="font-medium text-sm">Add Users to Group</h4>
							<Button
								size="sm"
								onClick={() => setShowAddForm(!showAddForm)}
								variant={showAddForm ? "outline" : "default"}
							>
								<Plus className="mr-2 h-4 w-4" />
								{showAddForm ? "Cancel" : "Add User"}
							</Button>
						</div>

						{showAddForm && (
							<div className="space-y-4 rounded-lg border p-4">
								<div className="relative">
									<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
									<Input
										placeholder="Search users..."
										value={userSearch}
										onChange={(e) => setUserSearch(e.target.value)}
										className="pl-10"
									/>
								</div>

								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<label className="font-medium text-sm">Select User</label>
										<Select
											value={addUserForm.selectedUserId}
											onValueChange={(value) =>
												setAddUserForm((prev) => ({
													...prev,
													selectedUserId: value,
												}))
											}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select a user" />
											</SelectTrigger>
											<SelectContent>
												{availableUsers.map((user) => (
													<SelectItem key={user.id} value={user.id}>
														<div className="flex flex-col">
															<span>{user.name || user.email}</span>
															<span className="text-muted-foreground text-xs">
																{user.email}
															</span>
														</div>
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2">
										<label className="font-medium text-sm">Role</label>
										<Select
											value={addUserForm.selectedRole}
											onValueChange={(value: "member" | "manager") =>
												setAddUserForm((prev) => ({
													...prev,
													selectedRole: value,
												}))
											}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="member">Member</SelectItem>
												<SelectItem value="manager">Manager</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>

								<Button
									onClick={handleAddUser}
									disabled={
										!addUserForm.selectedUserId || addToGroupMutation.isPending
									}
									className="w-full"
								>
									{addToGroupMutation.isPending
										? "Adding..."
										: "Add User to Group"}
								</Button>
							</div>
						)}
					</div>

					{/* Current Members Table */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h4 className="font-medium text-sm">
								Current Members ({group.memberCount})
							</h4>
						</div>

						{group.members.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-8 text-center">
								<UserMinus className="mb-4 h-12 w-12 text-muted-foreground" />
								<div className="mb-2 text-muted-foreground">
									No members in this group
								</div>
								<Button
									size="sm"
									onClick={() => setShowAddForm(true)}
									variant="outline"
								>
									<Plus className="mr-2 h-4 w-4" />
									Add First Member
								</Button>
							</div>
						) : (
							<div className="rounded-md border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Name</TableHead>
											<TableHead>Email</TableHead>
											<TableHead>Role</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{group.members.map((member) => (
											<TableRow key={member.id}>
												<TableCell className="font-medium">
													{member.name || "—"}
												</TableCell>
												<TableCell>{member.email}</TableCell>
												<TableCell>
													<Badge variant={getRoleBadgeVariant(member.role)}>
														{member.role}
													</Badge>
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
																onClick={() => handleRemoveUser(member.id)}
																className="text-destructive"
																disabled={removeFromGroupMutation.isPending}
															>
																<Trash2 className="mr-2 h-4 w-4" />
																Remove from Group
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
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
