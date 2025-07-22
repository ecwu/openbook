"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

	// Check if resource has active bookings
	const { data: resourceDetails } = api.resources.getById.useQuery(
		{ id: resource?.id || "" },
		{ enabled: !!resource?.id && open },
	);

	// For now, we'll simulate a delete by updating the resource to inactive
	// In a real system, you might want a soft delete or archive functionality
	const updateResource = api.resources.update.useMutation({
		onSuccess: () => {
			toast({
				title: "Success",
				description: "Resource has been deactivated",
			});
			setConfirmText("");
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

		// Instead of actual deletion, we'll deactivate the resource
		updateResource.mutate({
			id: resource.id,
			isActive: false,
			status: "offline" as const,
		});
	};

	if (!resource) return null;

	const hasActiveBookings = resource.currentUtilization > 0;
	const isConfirmValid = confirmText === resource.name;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Trash2 className="h-5 w-5 text-destructive" />
						Delete Resource
					</DialogTitle>
					<DialogDescription>
						This action will deactivate the resource and make it unavailable for
						new bookings.
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

					<Alert>
						<AlertTriangle className="h-4 w-4" />
						<AlertDescription>
							<strong>Note:</strong> This will deactivate the resource rather
							than permanently delete it. You can reactivate it later from the
							resource edit dialog.
						</AlertDescription>
					</Alert>

					{/* Confirmation Input */}
					<div className="space-y-2">
						<label className="font-medium text-sm">
							Type <strong>{resource.name}</strong> to confirm:
						</label>
						<input
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
							onOpenChange(false);
						}}
					>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={handleDelete}
						disabled={!isConfirmValid || updateResource.isPending}
					>
						{updateResource.isPending
							? "Deactivating..."
							: "Deactivate Resource"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
