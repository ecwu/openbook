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
import { useToast } from "@/hooks/use-toast";
import { api } from "@/trpc/react";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

interface Group {
	id: string;
	name: string;
	description?: string | null;
	memberCount: number;
}

interface DeleteGroupDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	group: Group | null;
	onSuccess: () => void;
}

export function DeleteGroupDialog({
	open,
	onOpenChange,
	group,
	onSuccess,
}: DeleteGroupDialogProps) {
	const [isDeleting, setIsDeleting] = useState(false);
	const { toast } = useToast();

	const deleteGroupMutation = api.groups.delete.useMutation({
		onSuccess: () => {
			toast({
				title: "Success",
				description: "Group deleted successfully",
			});
			onSuccess();
			onOpenChange(false);
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message || "Failed to delete group",
				variant: "destructive",
			});
		},
		onSettled: () => {
			setIsDeleting(false);
		},
	});

	const handleDelete = () => {
		if (!group) return;

		setIsDeleting(true);
		deleteGroupMutation.mutate({ id: group.id });
	};

	const handleOpenChange = (newOpen: boolean) => {
		if (!isDeleting) {
			onOpenChange(newOpen);
		}
	};

	if (!group) return null;

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<AlertTriangle className="h-5 w-5 text-destructive" />
						Delete Group
					</DialogTitle>
					<DialogDescription className="text-left">
						Are you sure you want to delete the group "{group.name}"?
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="rounded-lg bg-destructive/10 p-4">
						<p className="font-medium text-destructive text-sm">
							Warning: This action cannot be undone.
						</p>
						<ul className="mt-2 space-y-1 text-destructive text-sm">
							<li>
								• The group and all its settings will be permanently deleted
							</li>
							<li>
								• All {group.memberCount} member(s) will be removed from this
								group
							</li>
							<li>
								• All resource access permissions for this group will be removed
							</li>
							<li>
								• Any resource limits applied to this group will be deleted
							</li>
						</ul>
					</div>

					{group.description && (
						<div className="space-y-2">
							<p className="font-medium text-sm">Group Description:</p>
							<p className="rounded border bg-muted p-3 text-muted-foreground text-sm">
								{group.description}
							</p>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => handleOpenChange(false)}
						disabled={isDeleting}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="destructive"
						onClick={handleDelete}
						disabled={isDeleting}
					>
						{isDeleting ? "Deleting..." : "Delete Group"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
