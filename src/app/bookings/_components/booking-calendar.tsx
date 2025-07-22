"use client";

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
	extendedProps: {
		description?: string;
		status: string;
		bookingType: string;
		priority: string;
		requestedQuantity: number;
		allocatedQuantity?: number;
		resource: {
			id: string;
			name: string;
			type: string;
		};
		user: {
			id: string;
			name: string;
		};
		isOwner: boolean;
	};
}

export function BookingCalendar() {
	const [currentView, setCurrentView] = useState("timeGridWeek");
	const [selectedResourceId, setSelectedResourceId] = useState<string>("all");
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
		resourceId: selectedResourceId === "all" ? undefined : selectedResourceId,
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

		setDateClickInfo({
			date: clickedDate,
			resourceId: selectedResourceId === "all" ? undefined : selectedResourceId,
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

		setSelectInfo({
			start: startDate,
			end: endDate,
			resourceId: selectedResourceId === "all" ? undefined : selectedResourceId,
		});
		setShowCreateDialog(true);
	};

	// Transform events for FullCalendar
	const calendarEvents = events.map((event) => ({
		id: event.id,
		title: event.title,
		start: event.start,
		end: event.end,
		backgroundColor: event.color,
		borderColor: event.color,
		extendedProps: event.extendedProps,
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
										currentView === "dayGridMonth" ? "default" : "outline"
									}
									size="sm"
									onClick={() => handleViewChange("dayGridMonth")}
								>
									Month
								</Button>
								<Button
									variant={
										currentView === "timeGridWeek" ? "default" : "outline"
									}
									size="sm"
									onClick={() => handleViewChange("timeGridWeek")}
								>
									Week
								</Button>
								<Button
									variant={
										currentView === "timeGridDay" ? "default" : "outline"
									}
									size="sm"
									onClick={() => handleViewChange("timeGridDay")}
								>
									Day
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

						<div className="flex items-center gap-2">
							<Label>Resource:</Label>
							<Select
								value={selectedResourceId}
								onValueChange={setSelectedResourceId}
							>
								<SelectTrigger className="w-[200px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Resources</SelectItem>
									{resources.map((resource) => (
										<SelectItem key={resource.id} value={resource.id}>
											{resource.name} ({resource.type})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
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
					<div className="flex items-center gap-4 text-sm">
						<div className="flex items-center gap-2">
							<div className="h-3 w-3 rounded bg-yellow-500" />
							<span>Pending</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="h-3 w-3 rounded bg-green-500" />
							<span>Approved</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="h-3 w-3 rounded bg-blue-500" />
							<span>Active</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="h-3 w-3 rounded bg-gray-500" />
							<span>Other</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Calendar */}
			<Card>
				<CardContent className="p-6">
					<FullCalendar
						ref={calendarRef}
						plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
						initialView={currentView}
						headerToolbar={{
							left: "prev,next today",
							center: "title",
							right: "", // We handle view switching with our custom buttons
						}}
						events={calendarEvents}
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
						slotMinTime="06:00:00"
						slotMaxTime="22:00:00"
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
					/>
				</CardContent>
			</Card>

			{/* Dialogs */}
			<CreateBookingDialog
				open={showCreateDialog}
				onOpenChange={setShowCreateDialog}
				defaultDate={dateClickInfo?.date || selectInfo?.start}
				defaultEndDate={selectInfo?.end}
				defaultResourceId={dateClickInfo?.resourceId || selectInfo?.resourceId}
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
