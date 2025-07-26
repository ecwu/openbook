"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/trpc/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import resourcePlugin from "@fullcalendar/resource";
import resourceTimeGridPlugin from "@fullcalendar/resource-timegrid";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import timeGridPlugin from "@fullcalendar/timegrid";
import { Calendar, Plus, RefreshCw } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { CreateBookingDialog } from "./create-booking-dialog";
import { ViewBookingDialog } from "./view-booking-dialog";

interface CalendarEvent {
	id: string;
	title: string;
	start: Date;
	end: Date;
	color: string;
	resourceId?: string;
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

interface CalendarResource {
	id: string;
	title: string;
	extendedProps: {
		type: string;
		status: string;
		isActive: boolean;
	};
}

export function BookingCalendar() {
	const [currentView, setCurrentView] = useState("resourceTimeGridThreeDay");
	const [myBookingsOnly, setMyBookingsOnly] = useState(false);
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
		null,
	);
	const [dateClickInfo, setDateClickInfo] = useState<{
		date: Date;
		resourceId?: string;
	} | null>(null);
	const [selectInfo, setSelectInfo] = useState<{
		start: Date;
		end: Date;
		resourceId?: string;
	} | null>(null);

	const calendarRef = useRef<FullCalendar>(null);

	// Get calendar date range
	const getCalendarDateRange = useCallback(() => {
		const calendarApi = calendarRef.current?.getApi();
		if (!calendarApi) {
			const now = new Date();
			return {
				start: new Date(now.getFullYear(), now.getMonth(), 1),
				end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
			};
		}

		const view = calendarApi.view;
		return {
			start: view.activeStart,
			end: view.activeEnd,
		};
	}, []);

	const dateRange = getCalendarDateRange();

	// Fetch calendar events
	const {
		data: events = [],
		isLoading,
		refetch,
	} = api.bookings.getCalendarEvents.useQuery({
		start: dateRange.start,
		end: dateRange.end,
		resourceId: undefined, // Show all resources in vertical view
		myBookingsOnly,
	});

	// Fetch available resources for filter
	const { data: resources = [] } = api.resources.list.useQuery({
		limit: 100,
		sortBy: "name",
		sortOrder: "asc",
	});

	const handleDateClick = (info: any) => {
		const clickedDate = new Date(info.date);
		// Round to nearest hour
		clickedDate.setMinutes(0, 0, 0);

		// Clear selectInfo when using single date click
		setSelectInfo(null);
		setDateClickInfo({
			date: clickedDate,
			resourceId: info.resource?.id,
		});
		setShowCreateDialog(true);
	};

	const handleEventClick = (info: any) => {
		const event = events.find((e) => e.id === info.event.id);
		if (event) {
			setSelectedEvent(event);
		}
	};

	const handleViewChange = (view: string) => {
		setCurrentView(view);
		const calendarApi = calendarRef.current?.getApi();
		if (calendarApi) {
			calendarApi.changeView(view);
		}
	};

	const handleRefresh = () => {
		void refetch();
		toast.success("Calendar refreshed");
	};

	const handleEventDrop = (info: any) => {
		// Handle drag and drop - could implement booking time update here
		console.log("Event dropped:", info);
		// For now, revert the change
		info.revert();
		toast.info("Drag and drop editing coming soon!");
	};

	const handleEventResize = (info: any) => {
		// Handle resize - could implement booking duration update here
		console.log("Event resized:", info);
		// For now, revert the change
		info.revert();
		toast.info("Resize editing coming soon!");
	};

	const handleSelect = (info: any) => {
		const startDate = new Date(info.start);
		const endDate = new Date(info.end);

		// Round start time to nearest hour
		startDate.setMinutes(0, 0, 0);

		// Round end time to nearest hour
		endDate.setMinutes(0, 0, 0);

		// Clear dateClickInfo when using drag selection
		setDateClickInfo(null);
		setSelectInfo({
			start: startDate,
			end: endDate,
			resourceId: info.resource?.id,
		});
		setShowCreateDialog(true);
	};

	// Transform events for FullCalendar
	const calendarEvents = events.map((event) => ({
		id: event.id,
		title: event.title,
		start: event.start,
		end: event.end,
		resourceId: event.extendedProps.resource.id,
		backgroundColor: event.color,
		borderColor: event.color,
		extendedProps: event.extendedProps,
	}));

	// Transform resources for FullCalendar
	const calendarResources: CalendarResource[] = resources.map((resource) => ({
		id: resource.id,
		title: `${resource.name} (${resource.type})`,
		extendedProps: {
			type: resource.type,
			status: resource.status,
			isActive: resource.isActive,
		},
	}));

	return (
		<div className="space-y-6">
			{/* Controls */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2">
						<Calendar className="h-5 w-5" />
						Calendar Controls
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* View Controls */}
					<div className="flex flex-wrap items-center gap-4">
						<div className="flex items-center gap-2">
							<Label>View:</Label>
							<div className="flex gap-1">
								<Button
									variant={
										currentView === "resourceTimeGridThreeDay" ? "default" : "outline"
									}
									size="sm"
									onClick={() => handleViewChange("resourceTimeGridThreeDay")}
								>
									3 Days
								</Button>
								<Button
									variant={
										currentView === "resourceTimeGridWeek" ? "default" : "outline"
									}
									size="sm"
									onClick={() => handleViewChange("resourceTimeGridWeek")}
								>
									Week
								</Button>
								<Button
									variant={
										currentView === "resourceTimelineThreeDay" ? "default" : "outline"
									}
									size="sm"
									onClick={() => handleViewChange("resourceTimelineThreeDay")}
								>
									Timeline 3 Days
								</Button>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<Label htmlFor="my-bookings">My bookings only:</Label>
							<Switch
								id="my-bookings"
								checked={myBookingsOnly}
								onCheckedChange={setMyBookingsOnly}
							/>
						</div>


						<div className="ml-auto flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={handleRefresh}
								disabled={isLoading}
							>
								<RefreshCw
									className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
								/>
								Refresh
							</Button>
							<Button
								size="sm"
								onClick={() => {
									setDateClickInfo({ date: new Date() });
									setShowCreateDialog(true);
								}}
							>
								<Plus className="mr-2 h-4 w-4" />
								New Booking
							</Button>
						</div>
					</div>

					{/* Legend */}
					<div className="flex flex-wrap items-center gap-4 text-sm">
						<span className="text-muted-foreground">
							All resources are displayed vertically with bookings color-coded by resource
						</span>
					</div>
				</CardContent>
			</Card>

			{/* Calendar */}
			<Card>
				<CardContent className="p-6">
					<FullCalendar
						ref={calendarRef}
						plugins={[
							dayGridPlugin,
							timeGridPlugin,
							interactionPlugin,
							resourcePlugin,
							resourceTimeGridPlugin,
							resourceTimelinePlugin,
						]}
						schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
						initialView={currentView}
						headerToolbar={{
							left: "prev,next today",
							center: "title",
							right: "", // We handle view switching with our custom buttons
						}}
						events={calendarEvents}
						resources={calendarResources}
						selectable={true}
						selectMirror={true}
						dayMaxEvents={true}
						weekends={true}
						dateClick={handleDateClick}
						eventClick={handleEventClick}
						eventDrop={handleEventDrop}
						eventResize={handleEventResize}
						select={handleSelect}
						height="auto"
						slotMinTime="00:00:00"
						slotMaxTime="24:00:00"
						allDaySlot={false}
						nowIndicator={true}
						eventTimeFormat={{
							hour: "numeric",
							minute: "2-digit",
							meridiem: "short",
						}}
						slotLabelFormat={{
							hour: "numeric",
							minute: "2-digit",
							meridiem: "short",
						}}
						resourceAreaHeaderContent="Resources"
						resourceAreaWidth="200px"
						datesAboveResources={true}
						views={{
							resourceTimeGridThreeDay: {
								type: "resourceTimeGrid",
								duration: { days: 3 },
								buttonText: "3 Days",
							},
							resourceTimelineThreeDay: {
								type: "resourceTimeline",
								duration: { days: 3 },
								slotDuration: "01:00:00",
								slotLabelInterval: "02:00:00",
								buttonText: "Timeline 3 Days",
							},
							resourceTimelineWeek: {
								slotDuration: "01:00:00",
								slotLabelInterval: "02:00:00",
							},
						}}
					/>
				</CardContent>
			</Card>

			{/* Dialogs */}
			<CreateBookingDialog
				open={showCreateDialog}
				onOpenChange={setShowCreateDialog}
				defaultDate={selectInfo?.start || dateClickInfo?.date}
				defaultEndDate={selectInfo?.end}
				defaultResourceId={selectInfo?.resourceId || dateClickInfo?.resourceId}
				onSuccess={() => {
					void refetch();
					setDateClickInfo(null);
					setSelectInfo(null);
				}}
			/>

			<ViewBookingDialog
				open={!!selectedEvent}
				onOpenChange={(open) => !open && setSelectedEvent(null)}
				event={selectedEvent}
				onBookingUpdated={() => void refetch()}
			/>
		</div>
	);
}
