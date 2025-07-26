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
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const editLimitFormSchema = z.object({
	name: z.string().min(1, "Name is required").max(255),
	description: z.string().optional(),
	maxHoursPerDay: z.number().int().min(0).optional(),
	maxHoursPerWeek: z.number().int().min(0).optional(),
	maxHoursPerMonth: z.number().int().min(0).optional(),
	maxConcurrentBookings: z.number().int().min(0).optional(),
	maxBookingsPerDay: z.number().int().min(0).optional(),
	priority: z.number().int().default(0),
	isActive: z.boolean().default(true),
});

type EditLimitFormValues = z.infer<typeof editLimitFormSchema>;

interface Limit {
	id: string;
	name: string;
	description?: string | null;
	limitType: "user";
	targetId: string;
	resourceId?: string | null;
	maxHoursPerDay?: number | null;
	maxHoursPerWeek?: number | null;
	maxHoursPerMonth?: number | null;
	maxConcurrentBookings?: number | null;
	maxBookingsPerDay?: number | null;
	priority: number;
	isActive: boolean;
	createdAt: Date;
	target?: {
		id: string;
		name: string | null;
		email?: string;
	} | null;
	resource?: {
		id: string;
		name: string;
		type: string;
	} | null;
}

interface EditLimitDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	limit: Limit | null;
	onSuccess: () => void;
}

export function EditLimitDialog({
	open,
	onOpenChange,
	limit,
	onSuccess,
}: EditLimitDialogProps) {
	const form = useForm({
		resolver: zodResolver(editLimitFormSchema),
		defaultValues: {
			name: "",
			description: "",
			priority: 0,
			isActive: true,
		},
	});

	const updateLimitMutation = api.limits.update.useMutation({
		onSuccess: () => {
			toast.success("Limit updated successfully");
			onSuccess();
			onOpenChange(false);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update limit");
		},
	});

	// Reset form when limit changes
	useEffect(() => {
		if (limit && open) {
			form.reset({
				name: limit.name,
				description: limit.description || "",
				maxHoursPerDay: limit.maxHoursPerDay || undefined,
				maxHoursPerWeek: limit.maxHoursPerWeek || undefined,
				maxHoursPerMonth: limit.maxHoursPerMonth || undefined,
				maxConcurrentBookings: limit.maxConcurrentBookings || undefined,
				maxBookingsPerDay: limit.maxBookingsPerDay || undefined,
				priority: limit.priority,
				isActive: limit.isActive,
			});
		}
	}, [limit, open, form]);

	const onSubmit = (values: EditLimitFormValues) => {
		if (!limit) return;

		const submitData = {
			id: limit.id,
			...values,
			description: values.description || undefined,
			maxHoursPerDay: values.maxHoursPerDay || undefined,
			maxHoursPerWeek: values.maxHoursPerWeek || undefined,
			maxHoursPerMonth: values.maxHoursPerMonth || undefined,
			maxConcurrentBookings: values.maxConcurrentBookings || undefined,
			maxBookingsPerDay: values.maxBookingsPerDay || undefined,
		};
		updateLimitMutation.mutate(submitData);
	};

	if (!limit) {
		return null;
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Edit Resource Limit</DialogTitle>
					<DialogDescription>
						Update the resource limit settings. Note that limit type, target,
						and resource cannot be changed.
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						{/* Read-only info */}
						<div className="rounded-lg bg-muted p-4">
							<div className="grid grid-cols-2 gap-4 text-sm">
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
								<div>
									<span className="font-medium">Created:</span>{" "}
									{new Date(limit.createdAt).toLocaleDateString()}
								</div>
							</div>
						</div>

						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input placeholder="e.g., Daily GPU Limit" {...field} />
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
											placeholder="Optional description of this limit"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Time-based limits */}
						<div className="space-y-4">
							<h4 className="font-medium">Time-based Limits</h4>
							<div className="grid grid-cols-3 gap-4">
								<FormField
									control={form.control}
									name="maxHoursPerDay"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Max Hours/Day</FormLabel>
											<FormControl>
												<Input
													type="number"
													placeholder="No limit"
													{...field}
													onChange={(e) =>
														field.onChange(
															e.target.value
																? Number.parseInt(e.target.value)
																: undefined,
														)
													}
													value={field.value || ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="maxHoursPerWeek"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Max Hours/Week</FormLabel>
											<FormControl>
												<Input
													type="number"
													placeholder="No limit"
													{...field}
													onChange={(e) =>
														field.onChange(
															e.target.value
																? Number.parseInt(e.target.value)
																: undefined,
														)
													}
													value={field.value || ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="maxHoursPerMonth"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Max Hours/Month</FormLabel>
											<FormControl>
												<Input
													type="number"
													placeholder="No limit"
													{...field}
													onChange={(e) =>
														field.onChange(
															e.target.value
																? Number.parseInt(e.target.value)
																: undefined,
														)
													}
													value={field.value || ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>

						{/* Booking limits */}
						<div className="space-y-4">
							<h4 className="font-medium">Booking Limits</h4>
							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="maxConcurrentBookings"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Max Concurrent Bookings</FormLabel>
											<FormControl>
												<Input
													type="number"
													placeholder="No limit"
													{...field}
													onChange={(e) =>
														field.onChange(
															e.target.value
																? Number.parseInt(e.target.value)
																: undefined,
														)
													}
													value={field.value || ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="maxBookingsPerDay"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Max Bookings/Day</FormLabel>
											<FormControl>
												<Input
													type="number"
													placeholder="No limit"
													{...field}
													onChange={(e) =>
														field.onChange(
															e.target.value
																? Number.parseInt(e.target.value)
																: undefined,
														)
													}
													value={field.value || ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>

						{/* Advanced settings */}
						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="priority"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Priority</FormLabel>
										<FormControl>
											<Input
												type="number"
												{...field}
												onChange={(e) =>
													field.onChange(Number.parseInt(e.target.value) || 0)
												}
											/>
										</FormControl>
										<FormDescription>
											Higher numbers take precedence when limits conflict
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
											<FormDescription>Enable this limit</FormDescription>
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
						</div>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={updateLimitMutation.isPending}>
								{updateLimitMutation.isPending && (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								)}
								Update Limit
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
