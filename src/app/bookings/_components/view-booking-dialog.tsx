"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import {
	AlertTriangle,
	Calendar,
	CheckCircle,
	Clock,
	Edit,
	FileText,
	Server,
	Trash2,
	User,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CalendarEvent {
	id: string;
	title: string;
	start: Date;
	end: Date;
	color: string;
	extendedProps: {
		description?: string | null;
		status: string;
		bookingType: string;
		priority: string;
		requestedQuantity: number;
		allocatedQuantity?: number | null;
		resource: {
			id: string;
			name: string;
			type: string;
		};
		user: {
			id: string;
			name: string | null;
		};
		isOwner: boolean;
	};
}

interface ViewBookingDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	event: CalendarEvent | null;
	onBookingUpdated: () => void;
}

export function ViewBookingDialog({
	open,
	onOpenChange,
	event,
	onBookingUpdated,
}: ViewBookingDialogProps) {
	const [showCancelDialog, setShowCancelDialog] = useState(false);

	const cancelBooking = api.bookings.cancel.useMutation({
		onSuccess: () => {
			toast.success("Booking cancelled successfully");
			onBookingUpdated();
			onOpenChange(false);
			setShowCancelDialog(false);
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const approveBooking = api.bookings.approve.useMutation({
		onSuccess: () => {
			toast.success("Booking approved successfully");
			onBookingUpdated();
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const rejectBooking = api.bookings.reject.useMutation({
		onSuccess: () => {
			toast.success("Booking rejected");
			onBookingUpdated();
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	if (!event) return null;

	const { extendedProps } = event;
	const canEdit = extendedProps.isOwner && extendedProps.status === "pending";
	const canCancel =
		extendedProps.isOwner &&
		["pending", "approved"].includes(extendedProps.status);

	const getStatusColor = (status: string) => {
		switch (status) {
			case "pending":
				return "bg-yellow-500";
			case "approved":
				return "bg-green-500";
			case "active":
				return "bg-blue-500";
			case "completed":
				return "bg-gray-500";
			case "cancelled":
				return "bg-red-500";
			case "rejected":
				return "bg-red-600";
			default:
				return "bg-gray-400";
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "pending":
				return <Clock className="h-4 w-4" />;
			case "approved":
				return <CheckCircle className="h-4 w-4" />;
			case "active":
				return <CheckCircle className="h-4 w-4" />;
			case "completed":
				return <CheckCircle className="h-4 w-4" />;
			case "cancelled":
				return <XCircle className="h-4 w-4" />;
			case "rejected":
				return <XCircle className="h-4 w-4" />;
			default:
				return <AlertTriangle className="h-4 w-4" />;
		}
	};

	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case "critical":
				return "destructive";
			case "high":
				return "default";
			case "normal":
				return "secondary";
			case "low":
				return "outline";
			default:
				return "outline";
		}
	};

	const duration = Math.round(
		((event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60 * 24)) *
			24,
	);
	const durationText =
		duration >= 24
			? `${Math.floor(duration / 24)} day(s)`
			: `${duration} hour(s)`;

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Calendar className="h-5 w-5" />
							{event.title}
						</DialogTitle>
						<DialogDescription>
							Booking details and information
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						{/* Status and Priority */}
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-2">
								{getStatusIcon(extendedProps.status)}
								<Badge
									variant="secondary"
									className={`${getStatusColor(extendedProps.status)} text-white`}
								>
									{extendedProps.status.toUpperCase()}
								</Badge>
							</div>
							<Badge variant={getPriorityColor(extendedProps.priority)}>
								{extendedProps.priority.toUpperCase()} Priority
							</Badge>
							<Badge variant="outline">
								{extendedProps.bookingType.toUpperCase()}
							</Badge>
						</div>

						<Separator />

						{/* Time Information */}
						<div className="space-y-3">
							<h4 className="flex items-center gap-2 font-medium">
								<Clock className="h-4 w-4" />
								Time Details
							</h4>
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<span className="text-muted-foreground">Start:</span>
									<div className="font-medium">
										{format(event.start, "PPP 'at' p")}
									</div>
								</div>
								<div>
									<span className="text-muted-foreground">End:</span>
									<div className="font-medium">
										{format(event.end, "PPP 'at' p")}
									</div>
								</div>
								<div className="col-span-2">
									<span className="text-muted-foreground">Duration:</span>
									<span className="ml-2 font-medium">{durationText}</span>
								</div>
							</div>
						</div>

						<Separator />

						{/* Resource Information */}
						<div className="space-y-3">
							<h4 className="flex items-center gap-2 font-medium">
								<Server className="h-4 w-4" />
								Resource Details
							</h4>
							<div className="space-y-2 text-sm">
								<div>
									<span className="text-muted-foreground">Resource:</span>
									<span className="ml-2 font-medium">
										{extendedProps.resource.name} ({extendedProps.resource.type}
										)
									</span>
								</div>
								<div>
									<span className="text-muted-foreground">
										Requested Quantity:
									</span>
									<span className="ml-2 font-medium">
										{extendedProps.requestedQuantity}
									</span>
								</div>
								{extendedProps.allocatedQuantity && (
									<div>
										<span className="text-muted-foreground">
											Allocated Quantity:
										</span>
										<span className="ml-2 font-medium">
											{extendedProps.allocatedQuantity}
										</span>
									</div>
								)}
							</div>
						</div>

						<Separator />

						{/* User Information */}
						<div className="space-y-3">
							<h4 className="flex items-center gap-2 font-medium">
								<User className="h-4 w-4" />
								Booked by
							</h4>
							<div className="text-sm">
								<span className="font-medium">{extendedProps.user.name}</span>
								{extendedProps.isOwner && (
									<Badge variant="outline" className="ml-2">
										You
									</Badge>
								)}
							</div>
						</div>

						{/* Description */}
						{extendedProps.description && (
							<>
								<Separator />
								<div className="space-y-3">
									<h4 className="flex items-center gap-2 font-medium">
										<FileText className="h-4 w-4" />
										Description
									</h4>
									<p className="whitespace-pre-wrap text-muted-foreground text-sm">
										{extendedProps.description}
									</p>
								</div>
							</>
						)}
					</div>

					<DialogFooter className="flex justify-between">
						<div className="flex gap-2">
							{/* Admin actions */}
							{extendedProps.status === "pending" && (
								<>
									<Button
										variant="default"
										size="sm"
										onClick={() => approveBooking.mutate({ id: event.id })}
										disabled={approveBooking.isPending}
									>
										<CheckCircle className="mr-2 h-4 w-4" />
										Approve
									</Button>
									<Button
										variant="destructive"
										size="sm"
										onClick={() =>
											rejectBooking.mutate({
												id: event.id,
												reason: "Rejected by admin",
											})
										}
										disabled={rejectBooking.isPending}
									>
										<XCircle className="mr-2 h-4 w-4" />
										Reject
									</Button>
								</>
							)}
						</div>

						<div className="flex gap-2">
							{canEdit && (
								<Button variant="outline" size="sm">
									<Edit className="mr-2 h-4 w-4" />
									Edit
								</Button>
							)}

							{canCancel && (
								<Button
									variant="destructive"
									size="sm"
									onClick={() => setShowCancelDialog(true)}
								>
									<Trash2 className="mr-2 h-4 w-4" />
									Cancel
								</Button>
							)}

							<Button variant="outline" onClick={() => onOpenChange(false)}>
								Close
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Cancel Confirmation Dialog */}
			<AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancel Booking</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to cancel this booking? This action cannot
							be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep Booking</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => cancelBooking.mutate({ id: event.id })}
							disabled={cancelBooking.isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{cancelBooking.isPending ? "Cancelling..." : "Cancel Booking"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
