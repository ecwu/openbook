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
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const editGroupSchema = z.object({
	name: z.string().min(1, "Name is required").max(255),
	description: z.string().optional(),
	isActive: z.boolean(),
});

type EditGroupFormData = z.infer<typeof editGroupSchema>;

interface Group {
	id: string;
	name: string;
	description?: string | null;
	isActive: boolean;
}

interface EditGroupDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	group: Group | null;
	onSuccess: () => void;
}

export function EditGroupDialog({
	open,
	onOpenChange,
	group,
	onSuccess,
}: EditGroupDialogProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { toast } = useToast();

	const updateGroupMutation = api.groups.update.useMutation({
		onSuccess: () => {
			toast({
				title: "Success",
				description: "Group updated successfully",
			});
			onSuccess();
			onOpenChange(false);
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message || "Failed to update group",
				variant: "destructive",
			});
		},
		onSettled: () => {
			setIsSubmitting(false);
		},
	});

	const form = useForm<EditGroupFormData>({
		resolver: zodResolver(editGroupSchema),
		defaultValues: {
			name: "",
			description: "",
			isActive: true,
		},
	});

	// Reset form when group changes
	useEffect(() => {
		if (group) {
			form.reset({
				name: group.name,
				description: group.description || "",
				isActive: group.isActive,
			});
		}
	}, [group, form]);

	const onSubmit = (data: EditGroupFormData) => {
		if (!group) return;

		setIsSubmitting(true);
		updateGroupMutation.mutate({
			id: group.id,
			...data,
		});
	};

	const handleOpenChange = (newOpen: boolean) => {
		if (!isSubmitting) {
			onOpenChange(newOpen);
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-[525px]">
				<DialogHeader>
					<DialogTitle>Edit Group</DialogTitle>
					<DialogDescription>
						Update the group's information and settings.
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input placeholder="e.g., Research Team Alpha" {...field} />
									</FormControl>
									<FormDescription>
										A unique name to identify this group
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Optional description of the group's purpose..."
											className="resize-none"
											{...field}
										/>
									</FormControl>
									<FormDescription>
										Describe the group's purpose or members
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="isActive"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
									<div className="space-y-0.5">
										<FormLabel className="text-base">Active</FormLabel>
										<FormDescription>
											Active groups can access resources and make bookings
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => handleOpenChange(false)}
								disabled={isSubmitting}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "Updating..." : "Update Group"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
