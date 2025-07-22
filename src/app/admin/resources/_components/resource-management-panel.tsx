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
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";
import { useState } from "react";
import { CreateResourceDialog } from "./create-resource-dialog";
import { DeleteResourceDialog } from "./delete-resource-dialog";
import { EditResourceDialog } from "./edit-resource-dialog";

interface Resource {
	id: string;
	name: string;
	type: string;
	description?: string | null;
	status: "available" | "maintenance" | "offline";
	location?: string | null;
	totalCapacity: number;
	capacityUnit: string;
	isIndivisible: boolean;
	minAllocation?: number | null;
	maxAllocation?: number | null;
	isActive: boolean;
	currentUtilization: number;
	availableCapacity: number;
	utilizationPercentage: number;
	createdAt: Date;
	updatedAt?: Date | null;
}

export function ResourceManagementPanel() {
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [typeFilter, setTypeFilter] = useState<string>("all");
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [editingResource, setEditingResource] = useState<Resource | null>(null);
	const [deletingResource, setDeletingResource] = useState<Resource | null>(
		null,
	);
	const [sortBy, setSortBy] = useState<
		"name" | "type" | "status" | "createdAt"
	>("name");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

	const {
		data: resources = [],
		isLoading,
		refetch,
	} = api.resources.list.useQuery({
		search: search || undefined,
		status:
			statusFilter === "all"
				? undefined
				: (statusFilter as "available" | "maintenance" | "offline"),
		type: typeFilter === "all" ? undefined : typeFilter,
		limit: 50,
		sortBy,
		sortOrder,
	});

	const { data: resourceTypes = [] } = api.resources.getTypes.useQuery();

	const handleRefresh = () => {
		void refetch();
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "available":
				return "bg-green-500";
			case "maintenance":
				return "bg-yellow-500";
			case "offline":
				return "bg-red-500";
			default:
				return "bg-gray-500";
		}
	};

	const getStatusVariant = (status: string) => {
		switch (status) {
			case "available":
				return "default";
			case "maintenance":
				return "secondary";
			case "offline":
				return "destructive";
			default:
				return "outline";
		}
	};

	return (
		<div className="space-y-6">
			{/* Actions Bar */}
			<div className="flex flex-col gap-4 sm:flex-row">
				<div className="flex flex-1 gap-2">
					<div className="relative flex-1">
						<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
						<Input
							placeholder="Search resources..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-10"
						/>
					</div>
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-[140px]">
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Status</SelectItem>
							<SelectItem value="available">Available</SelectItem>
							<SelectItem value="maintenance">Maintenance</SelectItem>
							<SelectItem value="offline">Offline</SelectItem>
						</SelectContent>
					</Select>
					<Select value={typeFilter} onValueChange={setTypeFilter}>
						<SelectTrigger className="w-[140px]">
							<SelectValue placeholder="Type" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Types</SelectItem>
							{resourceTypes.map((type) => (
								<SelectItem key={type} value={type}>
									{type}
								</SelectItem>
							))}
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
						Add Resource
					</Button>
				</div>
			</div>

			{/* Resources Overview Cards */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="font-medium text-sm">
							Total Resources
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">{resources.length}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="font-medium text-sm">Available</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl text-green-600">
							{resources.filter((r) => r.status === "available").length}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="font-medium text-sm">
							Maintenance/Offline
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl text-orange-600">
							{
								resources.filter(
									(r) => r.status === "maintenance" || r.status === "offline",
								).length
							}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Resources Table */}
			<Card>
				<CardHeader>
					<CardTitle>Resources</CardTitle>
					<CardDescription>
						Manage all computing resources and their configurations
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="flex items-center justify-center py-8">
							<div className="text-muted-foreground">Loading resources...</div>
						</div>
					) : resources.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-8">
							<div className="mb-2 text-muted-foreground">
								No resources found
							</div>
							<Button onClick={() => setShowCreateDialog(true)}>
								<Plus className="mr-2 h-4 w-4" />
								Create First Resource
							</Button>
						</div>
					) : (
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-[200px]">Name</TableHead>
										<TableHead>Type</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Capacity</TableHead>
										<TableHead>Utilization</TableHead>
										<TableHead>Location</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{resources.map((resource) => (
										<TableRow key={resource.id}>
											<TableCell className="font-medium">
												<div className="space-y-1">
													<div>{resource.name}</div>
													{resource.description && (
														<div className="line-clamp-1 text-muted-foreground text-xs">
															{resource.description}
														</div>
													)}
												</div>
											</TableCell>
											<TableCell>
												<Badge variant="outline">{resource.type}</Badge>
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													<div
														className={`h-2 w-2 rounded-full ${getStatusColor(resource.status)}`}
													/>
													<Badge variant={getStatusVariant(resource.status)}>
														{resource.status}
													</Badge>
												</div>
											</TableCell>
											<TableCell>
												<div className="space-y-1">
													<div className="text-sm">
														{resource.totalCapacity} {resource.capacityUnit}
													</div>
													{resource.isIndivisible && (
														<Badge variant="secondary" className="text-xs">
															Indivisible
														</Badge>
													)}
												</div>
											</TableCell>
											<TableCell>
												<div className="min-w-[120px] space-y-2">
													<div className="flex justify-between text-xs">
														<span>
															{resource.currentUtilization}/
															{resource.totalCapacity}
														</span>
														<span>
															{Math.round(resource.utilizationPercentage)}%
														</span>
													</div>
													<Progress
														value={resource.utilizationPercentage}
														className="h-2"
													/>
												</div>
											</TableCell>
											<TableCell>
												<div className="text-muted-foreground text-sm">
													{resource.location || "—"}
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
															onClick={() => setEditingResource(resource)}
														>
															<Pencil className="mr-2 h-4 w-4" />
															Edit
														</DropdownMenuItem>
														<DropdownMenuItem
															onClick={() => setDeletingResource(resource)}
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
			<CreateResourceDialog
				open={showCreateDialog}
				onOpenChange={setShowCreateDialog}
				onSuccess={handleRefresh}
			/>

			<EditResourceDialog
				open={!!editingResource}
				onOpenChange={(open) => !open && setEditingResource(null)}
				resource={editingResource}
				onSuccess={handleRefresh}
			/>

			<DeleteResourceDialog
				open={!!deletingResource}
				onOpenChange={(open) => !open && setDeletingResource(null)}
				resource={deletingResource}
				onSuccess={handleRefresh}
			/>
		</div>
	);
}
