"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/trpc/react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";

interface Resource {
	id: string;
	name: string;
	type: string;
	status: "available" | "maintenance" | "offline";
	totalCapacity: number;
	capacityUnit: string;
	currentUtilization: number;
}

interface DeleteResourceDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	resource: Resource | null;
	onSuccess: () => void;
}

export function DeleteResourceDialog({
	open,
	onOpenChange,
	resource,
	onSuccess,
}: DeleteResourceDialogProps) {
	const { toast } = useToast();
	const [confirmText, setConfirmText] = useState("");
	const [permanentDelete, setPermanentDelete] = useState(false);

	// Check if resource has active bookings
	const { data: resourceDetails } = api.resources.getById.useQuery(
		{ id: resource?.id || "" },
		{ enabled: !!resource?.id && open },
	);

	// Soft delete (deactivate) mutation
	const updateResource = api.resources.update.useMutation({
		onSuccess: () => {
			toast({
				title: "Success",
				description: "Resource has been deactivated",
			});
			setConfirmText("");
			setPermanentDelete(false);
			onSuccess();
			onOpenChange(false);
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	// Permanent delete mutation
	const deleteResource = api.resources.delete.useMutation({
		onSuccess: () => {
			toast({
				title: "Success",
				description: "Resource has been permanently deleted",
			});
			setConfirmText("");
			setPermanentDelete(false);
			onSuccess();
			onOpenChange(false);
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const handleDelete = () => {
		if (!resource || confirmText !== resource.name) return;

		if (permanentDelete) {
			// Permanent deletion
			deleteResource.mutate({ id: resource.id });
		} else {
			// Soft delete (deactivate)
			updateResource.mutate({
				id: resource.id,
				isActive: false,
				status: "offline" as const,
			});
		}
	};

	if (!resource) return null;

	const hasActiveBookings = resource.currentUtilization > 0;
	const isConfirmValid = confirmText === resource.name;
	const isLoading = updateResource.isPending || deleteResource.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Trash2 className="h-5 w-5 text-destructive" />
						{permanentDelete
							? "Permanently Delete Resource"
							: "Delete Resource"}
					</DialogTitle>
					<DialogDescription>
						{permanentDelete
							? "This action will permanently delete the resource and all its data. This cannot be undone."
							: "This action will deactivate the resource and make it unavailable for new bookings."}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Resource Details */}
					<div className="space-y-2 rounded-lg border p-4">
						<div className="flex items-center justify-between">
							<h4 className="font-medium">{resource.name}</h4>
							<Badge variant="outline">{resource.type}</Badge>
						</div>
						<div className="text-muted-foreground text-sm">
							Capacity: {resource.totalCapacity} {resource.capacityUnit}
						</div>
						<div className="text-muted-foreground text-sm">
							Current Status:{" "}
							<Badge variant="secondary">{resource.status}</Badge>
						</div>
					</div>

					{/* Warnings */}
					{hasActiveBookings && (
						<Alert>
							<AlertTriangle className="h-4 w-4" />
							<AlertDescription>
								This resource has active bookings ({resource.currentUtilization}
								/{resource.totalCapacity} {resource.capacityUnit} allocated).
								Deactivating will prevent new bookings but won't affect existing
								ones.
							</AlertDescription>
						</Alert>
					)}

					{resourceDetails?.recentBookings &&
						resourceDetails.recentBookings.length > 0 && (
							<Alert>
								<AlertTriangle className="h-4 w-4" />
								<AlertDescription>
									This resource has {resourceDetails.recentBookings.length}{" "}
									recent booking(s). Consider notifying affected users before
									deactivating.
								</AlertDescription>
							</Alert>
						)}

					{/* Deletion Type Selection */}
					<div className="space-y-3 rounded-lg border p-4">
						<div className="flex items-center space-x-2">
							<Checkbox
								id="permanent-delete"
								checked={permanentDelete}
								onCheckedChange={(checked) => setPermanentDelete(!!checked)}
							/>
							<label
								htmlFor="permanent-delete"
								className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
							>
								Permanently delete this resource
							</label>
						</div>
						{permanentDelete ? (
							<Alert>
								<AlertTriangle className="h-4 w-4" />
								<AlertDescription>
									<strong>Warning:</strong> This will permanently delete the
									resource and all associated data including bookings, access
									rules, and limits. This action cannot be undone.
								</AlertDescription>
							</Alert>
						) : (
							<Alert>
								<AlertTriangle className="h-4 w-4" />
								<AlertDescription>
									<strong>Note:</strong> This will deactivate the resource
									rather than permanently delete it. You can reactivate it later
									from the resource edit dialog.
								</AlertDescription>
							</Alert>
						)}
					</div>

					{/* Confirmation Input */}
					<div className="space-y-2">
						<label htmlFor="confirm-text" className="font-medium text-sm">
							Type <strong>{resource.name}</strong> to confirm:
						</label>
						<input
							id="confirm-text"
							type="text"
							value={confirmText}
							onChange={(e) => setConfirmText(e.target.value)}
							className="w-full rounded-md border border-input px-3 py-2 text-sm"
							placeholder={resource.name}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => {
							setConfirmText("");
							setPermanentDelete(false);
							onOpenChange(false);
						}}
					>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={handleDelete}
						disabled={!isConfirmValid || isLoading}
					>
						{isLoading
							? permanentDelete
								? "Deleting..."
								: "Deactivating..."
							: permanentDelete
								? "Permanently Delete"
								: "Deactivate Resource"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
