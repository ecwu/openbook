import { BookingCalendar } from "./_components/booking-calendar";

export default function BookingsPage() {
	return (
		<div className="container mx-auto space-y-8 py-8">
			<div className="space-y-2">
				<h1 className="font-bold text-3xl tracking-tight">Bookings</h1>
				<p className="text-muted-foreground">
					View and manage resource bookings using the calendar below
				</p>
			</div>

			<BookingCalendar />
		</div>
	);
}
