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
import { differenceInHours, differenceInMinutes, format } from "date-fns";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const createBookingSchema = z.object({
	resourceId: z.string().min(1, "Resource is required"),
	title: z.string().min(1, "Title is required").max(255),
	description: z.string().optional(),
	startTime: z
		.string()
		.min(1, "Start time is required")
		.refine(
			(dateString) => {
				const date = new Date(dateString);
				const twoHoursAgo = new Date();
				twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
				return date >= twoHoursAgo;
			},
			{
				message: "Start time cannot be earlier than 2 hours ago",
			},
		),
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
	const [availableCapacity, setAvailableCapacity] = useState<number | null>(
		null,
	);

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

	// Watch form values for reactive updates
	const watchResourceId = form.watch("resourceId");
	const watchBookingType = form.watch("bookingType");
	const watchStartTime = form.watch("startTime");
	const watchEndTime = form.watch("endTime");

	// Fetch resources
	const { data: resources = [] } = api.resources.list.useQuery({
		limit: 100,
		sortBy: "name",
		sortOrder: "asc",
	});

	// Check available capacity for selected time range and resource
	const { data: capacityData } = api.bookings.checkAvailableCapacity.useQuery(
		{
			resourceId: watchResourceId,
			startTime: watchStartTime ? new Date(watchStartTime) : new Date(),
			endTime: watchEndTime ? new Date(watchEndTime) : new Date(),
		},
		{
			enabled: !!(watchResourceId && watchStartTime && watchEndTime),
			retryOnMount: false,
		},
	);

	// Validate booking against user limits
	const { data: limitValidation } = api.limits.validateBooking.useQuery(
		{
			resourceId: watchResourceId,
			startTime: watchStartTime ? new Date(watchStartTime) : new Date(),
			endTime: watchEndTime ? new Date(watchEndTime) : new Date(),
			bookingType: watchBookingType as "shared" | "exclusive",
		},
		{
			enabled: !!(
				watchResourceId &&
				watchStartTime &&
				watchEndTime &&
				watchBookingType
			),
			retryOnMount: false,
		},
	);

	// Update available capacity when capacity data changes
	useEffect(() => {
		if (capacityData) {
			setAvailableCapacity(capacityData.availableCapacity);
		} else {
			setAvailableCapacity(null);
		}
	}, [capacityData]);

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

	// Calculate selection duration
	const getSelectionDuration = () => {
		if (!watchStartTime || !watchEndTime) return null;
		const start = new Date(watchStartTime);
		const end = new Date(watchEndTime);
		if (end <= start) return null;

		const minutes = differenceInMinutes(end, start);
		if (minutes < 60) {
			return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
		}

		const hours = differenceInHours(end, start);
		const remainingMinutes = minutes % 60;
		if (remainingMinutes === 0) {
			return `${hours} hour${hours !== 1 ? "s" : ""}`;
		}
		return `${hours}h ${remainingMinutes}m`;
	};

	const selectionDuration = getSelectionDuration();

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

		// Check if selected resource is bookable
		const selectedResource = resources.find((r) => r.id === values.resourceId);
		if (!selectedResource) {
			toast.error("Selected resource not found");
			return;
		}
		if (selectedResource.status === "offline") {
			toast.error("Cannot book an offline resource");
			return;
		}
		if (!selectedResource.isActive) {
			toast.error("Cannot book a disabled resource");
			return;
		}
		if (selectedResource.status === "maintenance") {
			toast.error("Cannot book a resource that is in maintenance");
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
												{resources
													.filter((resource) => resource.status !== "offline") // Hide offline resources
													.map((resource) => (
														<SelectItem
															key={resource.id}
															value={resource.id}
															disabled={
																!resource.isActive ||
																resource.status !== "available"
															} // Disable if not active or not available
															className={
																!resource.isActive ||
																resource.status !== "available"
																	? "text-muted-foreground"
																	: ""
															}
														>
															{resource.name} ({resource.type}) -{" "}
															{resource.totalCapacity} {resource.capacityUnit}
															{!resource.isActive && " - DISABLED"}
															{resource.isActive &&
																resource.status !== "available" &&
																` - ${resource.status.toUpperCase()}`}
														</SelectItem>
													))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							{/* Available Capacity Display */}
							{selectedResource && selectionDuration && (
								<div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
									<div className="mb-1 font-medium text-blue-900">
										Resource Availability
									</div>
									<div className="text-blue-800">
										<strong>{selectedResource.name}</strong> for{" "}
										{selectionDuration}
									</div>
									{availableCapacity !== null ? (
										<div className="mt-1 text-blue-700">
											Available: <strong>{availableCapacity}</strong> of{" "}
											{selectedResource.totalCapacity}{" "}
											{selectedResource.capacityUnit}
										</div>
									) : (
										<div className="mt-1 text-blue-600 text-xs">
											Checking availability...
										</div>
									)}
								</div>
							)}

							{/* Limit Validation Warnings */}
							{limitValidation && !limitValidation.valid && (
								<div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm">
									<div className="mb-2 font-medium text-orange-900">
										⚠️ Limit Violations
									</div>
									<div className="space-y-1">
										{limitValidation.violations.map((violation, index) => (
											<div key={index} className="text-orange-800 text-xs">
												• {violation}
											</div>
										))}
									</div>
									{limitValidation.usageStats && (
										<div className="mt-2 border-orange-200 border-t pt-2">
											<div className="font-medium text-orange-900 text-xs">
												Current Usage:
											</div>
											<div className="mt-1 space-y-1 text-orange-700 text-xs">
												{limitValidation.usageStats.dailyHours && (
													<div>
														Today: {limitValidation.usageStats.dailyHours}h
													</div>
												)}
												{limitValidation.usageStats.weeklyHours && (
													<div>
														This week: {limitValidation.usageStats.weeklyHours}h
													</div>
												)}
												{limitValidation.usageStats.monthlyHours && (
													<div>
														This month:{" "}
														{limitValidation.usageStats.monthlyHours}h
													</div>
												)}
											</div>
										</div>
									)}
								</div>
							)}

							{/* Limit Validation Success */}
							{limitValidation?.valid && selectionDuration && (
								<div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm">
									<div className="mb-1 font-medium text-green-900">
										✓ All Limits Satisfied
									</div>
									<div className="text-green-800 text-xs">
										This booking complies with all your resource usage limits.
									</div>
								</div>
							)}
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

							{/* Duration Display */}
							{selectionDuration && (
								<div className="rounded-md bg-muted p-3 text-sm">
									<div className="font-medium text-muted-foreground">
										Duration
									</div>
									<div className="text-foreground">{selectionDuration}</div>
								</div>
							)}
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
													max={
														availableCapacity !== null
															? Math.min(
																	availableCapacity,
																	selectedResource?.totalCapacity ||
																		Number.POSITIVE_INFINITY,
																)
															: selectedResource?.totalCapacity || undefined
													}
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
							<Button
								type="submit"
								disabled={
									createBooking.isPending ||
									(limitValidation && !limitValidation.valid)
								}
							>
								{createBooking.isPending
									? "Creating..."
									: limitValidation && !limitValidation.valid
										? "Cannot Create - Limit Violations"
										: "Create Booking"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
