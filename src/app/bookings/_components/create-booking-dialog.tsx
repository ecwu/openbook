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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const createBookingSchema = z.object({
	resourceId: z.string().min(1, "Resource is required"),
	title: z.string().min(1, "Title is required").max(255),
	description: z.string().optional(),
	startTime: z.string().min(1, "Start time is required"),
	endTime: z.string().min(1, "End time is required"),
	requestedQuantity: z.number().min(1, "Quantity must be at least 1"),
	bookingType: z.enum(["shared", "exclusive"]),
	priority: z.enum(["low", "normal", "high", "critical"]),
});

type CreateBookingForm = z.infer<typeof createBookingSchema>;

interface CreateBookingDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	defaultDate?: Date;
	defaultEndDate?: Date;
	defaultResourceId?: string;
	onSuccess: () => void;
}

export function CreateBookingDialog({
	open,
	onOpenChange,
	defaultDate,
	defaultEndDate,
	defaultResourceId,
	onSuccess,
}: CreateBookingDialogProps) {
	const [selectedResource, setSelectedResource] = useState<any>(null);

	const form = useForm<CreateBookingForm>({
		resolver: zodResolver(createBookingSchema),
		defaultValues: {
			resourceId: "",
			title: "",
			description: "",
			startTime: "",
			endTime: "",
			requestedQuantity: 1,
			bookingType: "shared",
			priority: "normal",
		},
	});

	// Fetch resources
	const { data: resources = [] } = api.resources.list.useQuery({
		limit: 100,
		status: "available",
		sortBy: "name",
		sortOrder: "asc",
	});

	const createBooking = api.bookings.create.useMutation({
		onSuccess: () => {
			toast.success("Booking created successfully");
			form.reset();
			onSuccess();
			onOpenChange(false);
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	// Set default values when dialog opens
	useEffect(() => {
		if (open) {
			const now = defaultDate || new Date();
			const startTime = new Date(now);
			startTime.setMinutes(0, 0, 0);

			// Use defaultEndDate if provided, otherwise add 1 hour to start time
			const endTime = defaultEndDate
				? new Date(defaultEndDate)
				: new Date(startTime);
			if (!defaultEndDate) {
				endTime.setHours(endTime.getHours() + 1);
			}
			endTime.setMinutes(0, 0, 0);

			form.reset({
				resourceId: defaultResourceId || "",
				title: "",
				description: "",
				startTime: format(startTime, "yyyy-MM-dd'T'HH:mm"),
				endTime: format(endTime, "yyyy-MM-dd'T'HH:mm"),
				requestedQuantity: 1,
				bookingType: "shared",
				priority: "normal",
			});
		}
	}, [open, defaultDate, defaultEndDate, defaultResourceId, form]);

	// Update selected resource when resource changes
	const watchResourceId = form.watch("resourceId");
	const watchBookingType = form.watch("bookingType");

	useEffect(() => {
		const resource = resources.find((r) => r.id === watchResourceId);
		setSelectedResource(resource);

		if (resource) {
			// Adjust quantity based on resource constraints
			let defaultQuantity = 1;
			if (resource.isIndivisible || resource.minAllocation) {
				defaultQuantity = resource.minAllocation || resource.totalCapacity;
			}
			form.setValue("requestedQuantity", defaultQuantity);

			// Set booking type based on resource type
			if (resource.isIndivisible) {
				form.setValue("bookingType", "exclusive");
			}
		}
	}, [watchResourceId, resources, form]);

	// Update quantity when booking type changes to exclusive
	useEffect(() => {
		if (
			selectedResource &&
			watchBookingType === "exclusive" &&
			!selectedResource.isIndivisible
		) {
			// For exclusive bookings on non-indivisible resources, set full capacity
			form.setValue("requestedQuantity", selectedResource.totalCapacity);
		}
	}, [watchBookingType, selectedResource, form]);

	const onSubmit = (values: CreateBookingForm) => {
		const startTime = new Date(values.startTime);
		const endTime = new Date(values.endTime);

		if (endTime <= startTime) {
			toast.error("End time must be after start time");
			return;
		}

		createBooking.mutate({
			...values,
			startTime,
			endTime,
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="mx-auto max-w-2xl">
				<DialogHeader>
					<DialogTitle>Create New Booking</DialogTitle>
					<DialogDescription>
						Book a resource for a specific time period
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="mx-auto max-w-xl space-y-6"
					>
						{/* Resource Selection */}
						<div className="space-y-4">
							<h3 className="font-medium text-muted-foreground text-sm">
								Resource
							</h3>
							<FormField
								control={form.control}
								name="resourceId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Select Resource</FormLabel>
										<Select onValueChange={field.onChange} value={field.value}>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Choose a resource to book" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{resources.map((resource) => (
													<SelectItem key={resource.id} value={resource.id}>
														{resource.name} ({resource.type}) -{" "}
														{resource.totalCapacity} {resource.capacityUnit}
														{resource.status !== "available" &&
															` - ${resource.status}`}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						{/* Basic Information */}
						<div className="space-y-4">
							<h3 className="font-medium text-muted-foreground text-sm">
								Booking Details
							</h3>
							<FormField
								control={form.control}
								name="title"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Title</FormLabel>
										<FormControl>
											<Input placeholder="e.g., ML Training Job" {...field} />
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
										<FormLabel>Description (Optional)</FormLabel>
										<FormControl>
											<Textarea
												placeholder="Brief description of the booking purpose"
												className="resize-none"
												rows={2}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						{/* Time Selection */}
						<div className="space-y-4">
							<h3 className="font-medium text-muted-foreground text-sm">
								Schedule
							</h3>
							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="startTime"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Start Time</FormLabel>
											<FormControl>
												<Input type="datetime-local" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="endTime"
									render={({ field }) => (
										<FormItem>
											<FormLabel>End Time</FormLabel>
											<FormControl>
												<Input type="datetime-local" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>

						{/* Booking Configuration */}
						<div className="space-y-4">
							<h3 className="font-medium text-muted-foreground text-sm">
								Configuration
							</h3>
							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="bookingType"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Booking Type</FormLabel>
											<Select
												onValueChange={field.onChange}
												value={field.value}
												disabled={selectedResource?.isIndivisible}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="shared">Shared</SelectItem>
													<SelectItem value="exclusive">Exclusive</SelectItem>
												</SelectContent>
											</Select>
											<FormDescription>
												{watchBookingType === "exclusive"
													? "No other bookings allowed during this time"
													: "Other bookings may share this resource"}
												{selectedResource?.isIndivisible &&
													" (Required for this resource)"}
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="requestedQuantity"
									render={({ field }) => (
										<FormItem
											className={
												watchBookingType === "exclusive" ? "opacity-60" : ""
											}
										>
											<FormLabel>Quantity</FormLabel>
											<FormControl>
												<Input
													type="number"
													min="1"
													max={selectedResource?.totalCapacity || undefined}
													disabled={
														selectedResource?.isIndivisible ||
														(watchBookingType === "exclusive" &&
															!selectedResource?.isIndivisible)
													}
													{...field}
													onChange={(e) =>
														field.onChange(Number.parseInt(e.target.value) || 1)
													}
												/>
											</FormControl>
											<FormDescription>
												{selectedResource && (
													<>
														{selectedResource.capacityUnit}
														{selectedResource.isIndivisible &&
															" (Full resource required)"}
														{watchBookingType === "exclusive" &&
															!selectedResource.isIndivisible &&
															" (Full capacity required for exclusive booking)"}
														{selectedResource.minAllocation &&
															` (Min: ${selectedResource.minAllocation})`}
														{selectedResource.maxAllocation &&
															` (Max: ${selectedResource.maxAllocation})`}
													</>
												)}
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>

						{/* Priority */}
						<div className="space-y-4">
							<h3 className="font-medium text-muted-foreground text-sm">
								Priority
							</h3>
							<FormField
								control={form.control}
								name="priority"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Priority Level</FormLabel>
										<Select onValueChange={field.onChange} value={field.value}>
											<FormControl>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="low">Low</SelectItem>
												<SelectItem value="normal">Normal</SelectItem>
												<SelectItem value="high">High</SelectItem>
												<SelectItem value="critical">Critical</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
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
							<Button type="submit" disabled={createBooking.isPending}>
								{createBooking.isPending ? "Creating..." : "Create Booking"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
