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
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const createGroupSchema = z.object({
	name: z.string().min(1, "Name is required").max(255),
	description: z.string().optional(),
	isActive: z.boolean().default(true),
});

type CreateGroupFormData = z.infer<typeof createGroupSchema>;

interface CreateGroupDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
}

export function CreateGroupDialog({
	open,
	onOpenChange,
	onSuccess,
}: CreateGroupDialogProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { toast } = useToast();

	const createGroupMutation = api.groups.create.useMutation({
		onSuccess: () => {
			toast({
				title: "Success",
				description: "Group created successfully",
			});
			onSuccess();
			onOpenChange(false);
			form.reset();
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message || "Failed to create group",
				variant: "destructive",
			});
		},
		onSettled: () => {
			setIsSubmitting(false);
		},
	});

	const form = useForm<CreateGroupFormData>({
		resolver: zodResolver(createGroupSchema),
		defaultValues: {
			name: "",
			description: "",
			isActive: true,
		},
	});

	const onSubmit = (data: CreateGroupFormData) => {
		setIsSubmitting(true);
		createGroupMutation.mutate(data);
	};

	const handleOpenChange = (newOpen: boolean) => {
		if (!isSubmitting) {
			onOpenChange(newOpen);
			if (!newOpen) {
				form.reset();
			}
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-[525px]">
				<DialogHeader>
					<DialogTitle>Create Group</DialogTitle>
					<DialogDescription>
						Create a new user group to organize users and manage resource
						access.
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
								{isSubmitting ? "Creating..." : "Create Group"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
