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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const limitFormSchema = z.object({
	name: z.string().min(1, "Name is required").max(255),
	description: z.string().optional(),
	limitType: z.enum(["user"]).default("user"),
	targetId: z.string().min(1, "Target is required"),
	resourceId: z.string().optional(),
	maxHoursPerDay: z.number().int().min(0).optional(),
	maxHoursPerWeek: z.number().int().min(0).optional(),
	maxHoursPerMonth: z.number().int().min(0).optional(),
	maxConcurrentBookings: z.number().int().min(0).optional(),
	maxBookingsPerDay: z.number().int().min(0).optional(),
	priority: z.number().int().default(0),
	isActive: z.boolean().default(true),
});

type LimitFormValues = z.infer<typeof limitFormSchema>;

interface CreateLimitDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
}

export function CreateLimitDialog({
	open,
	onOpenChange,
	onSuccess,
}: CreateLimitDialogProps) {
	const form = useForm({
		resolver: zodResolver(limitFormSchema),
		defaultValues: {
			name: "",
			description: "",
			limitType: "user",
			targetId: "",
			resourceId: "all",
			priority: 0,
			isActive: true,
		},
	});

	// Get users for user limits
	const { data: users = [] } = api.users.list.useQuery({ limit: 100 });

	// Get resources
	const { data: resources = [] } = api.resources.list.useQuery({ limit: 100 });

	const createLimitMutation = api.limits.create.useMutation({
		onSuccess: () => {
			toast.success("Limit created successfully");
			form.reset();
			onSuccess();
			onOpenChange(false);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to create limit");
		},
	});

	const onSubmit = (values: LimitFormValues) => {
		const submitData = {
			...values,
			resourceId:
				values.resourceId === "all"
					? undefined
					: values.resourceId || undefined,
			description: values.description || undefined,
			maxHoursPerDay: values.maxHoursPerDay || undefined,
			maxHoursPerWeek: values.maxHoursPerWeek || undefined,
			maxHoursPerMonth: values.maxHoursPerMonth || undefined,
			maxConcurrentBookings: values.maxConcurrentBookings || undefined,
			maxBookingsPerDay: values.maxBookingsPerDay || undefined,
		};
		createLimitMutation.mutate(submitData);
	};

	const getTargetOptions = () => {
		return users.map((user) => ({
			value: user.id,
			label: user.name || user.email,
			description: user.email,
		}));
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Create User Resource Limit</DialogTitle>
					<DialogDescription>
						Create a new resource limit to control usage for a specific user.
						System defaults apply to all users automatically.
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
										<Input
											placeholder="e.g., Daily GPU Limit for John"
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
											placeholder="Optional description of this limit"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="targetId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Target User</FormLabel>
										<Select onValueChange={field.onChange} value={field.value}>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select user" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{getTargetOptions().map((option) => (
													<SelectItem key={option.value} value={option.value}>
														<div>
															<div>{option.label}</div>
															{option.description && (
																<div className="text-muted-foreground text-xs">
																	{option.description}
																</div>
															)}
														</div>
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="resourceId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Resource (Optional)</FormLabel>
										<Select onValueChange={field.onChange} value={field.value}>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="All resources" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="all">All Resources</SelectItem>
												{resources.map((resource) => (
													<SelectItem key={resource.id} value={resource.id}>
														<div>
															<div>{resource.name}</div>
															<div className="text-muted-foreground text-xs">
																{resource.type}
															</div>
														</div>
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormDescription>
											Leave empty to apply to all resources
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

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
											<FormDescription>
												Enable this limit immediately
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
						</div>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={createLimitMutation.isPending}>
								{createLimitMutation.isPending && (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								)}
								Create Limit
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
