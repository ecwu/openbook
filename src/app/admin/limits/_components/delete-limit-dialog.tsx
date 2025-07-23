"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/trpc/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Limit {
	id: string;
	name: string;
	description?: string | null;
	limitType: "group" | "user" | "group_per_person";
	targetId: string;
	resourceId?: string | null;
	target?: {
		id: string;
		name: string | null;
		email?: string;
		description?: string | null;
	} | null;
	resource?: {
		id: string;
		name: string;
		type: string;
	} | null;
}

interface DeleteLimitDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	limit: Limit | null;
	onSuccess: () => void;
}

export function DeleteLimitDialog({
	open,
	onOpenChange,
	limit,
	onSuccess,
}: DeleteLimitDialogProps) {
	const deleteLimitMutation = api.limits.delete.useMutation({
		onSuccess: () => {
			toast.success("Limit deleted successfully");
			onSuccess();
			onOpenChange(false);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to delete limit");
		},
	});

	const handleDelete = () => {
		if (!limit) return;
		deleteLimitMutation.mutate({ id: limit.id });
	};

	if (!limit) {
		return null;
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Resource Limit</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete this resource limit? This action
						cannot be undone.
					</DialogDescription>
				</DialogHeader>

				<div className="rounded-lg bg-muted p-4">
					<div className="space-y-2">
						<div>
							<span className="font-medium">Name:</span> {limit.name}
						</div>
						{limit.description && (
							<div>
								<span className="font-medium">Description:</span>{" "}
								{limit.description}
							</div>
						)}
						<div>
							<span className="font-medium">Type:</span>{" "}
							<span className="capitalize">
								{limit.limitType.replace("_", " ")}
							</span>
						</div>
						<div>
							<span className="font-medium">Target:</span>{" "}
							{limit.target?.name || limit.target?.email || "Unknown"}
						</div>
						<div>
							<span className="font-medium">Resource:</span>{" "}
							{limit.resource?.name || "All Resources"}
						</div>
					</div>
				</div>

				<div className="rounded-lg bg-destructive/10 p-4 text-destructive">
					<p className="font-medium">Warning:</p>
					<p className="text-sm">
						Deleting this limit will immediately remove all usage restrictions
						it enforces. Users or groups previously restricted by this limit
						will have unrestricted access according to any remaining limits.
					</p>
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="destructive"
						onClick={handleDelete}
						disabled={deleteLimitMutation.isPending}
					>
						{deleteLimitMutation.isPending && (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						)}
						Delete Limit
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
