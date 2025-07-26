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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const createEventSchema = z.object({
	name: z.string().min(1, "Name is required").max(255, "Name too long"),
	description: z.string().optional(),
	deadline: z.string().min(1, "Deadline is required"),
	timezone: z.string().min(1, "Timezone is required"),
});

type CreateEventForm = z.infer<typeof createEventSchema>;

interface CreateEventDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
}

export function CreateEventDialog({
	open,
	onOpenChange,
	onSuccess,
}: CreateEventDialogProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);

	const form = useForm<CreateEventForm>({
		resolver: zodResolver(createEventSchema),
		defaultValues: {
			name: "",
			description: "",
			deadline: "",
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		},
	});

	const createMutation = api.events.create.useMutation({
		onSuccess: () => {
			onSuccess();
			form.reset();
		},
		onError: (error) => {
			console.error("Error creating event:", error);
		},
		onSettled: () => {
			setIsSubmitting(false);
		},
	});

	const onSubmit = (data: CreateEventForm) => {
		setIsSubmitting(true);

		// Convert the datetime-local input to a Date object
		// The input gives us a string like "2024-12-01T23:59"
		const deadlineDate = new Date(data.deadline);

		createMutation.mutate({
			name: data.name,
			description: data.description,
			deadline: deadlineDate,
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Create Event</DialogTitle>
					<DialogDescription>
						Create a new event deadline for others to track and join.
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Event Name</FormLabel>
									<FormControl>
										<Input
											placeholder="e.g., ICML 2025 Submission"
											{...field}
										/>
									</FormControl>
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
											placeholder="Brief description of the event..."
											className="resize-none"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="deadline"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Deadline</FormLabel>
									<FormControl>
										<Input type="datetime-local" {...field} />
									</FormControl>
									<FormDescription>
										Select the deadline date and time in your local timezone
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="timezone"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Your Timezone</FormLabel>
									<FormControl>
										<Input
											{...field}
											disabled
											className="text-muted-foreground"
										/>
									</FormControl>
									<FormDescription>
										Automatically detected from your browser
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "Creating..." : "Create Event"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
