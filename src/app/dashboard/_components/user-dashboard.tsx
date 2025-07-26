"use client";

import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/trpc/react";
import { Calendar, Clock, Settings, TrendingUp, User } from "lucide-react";
import { LimitCard } from "./limit-card";
import { UsageChart } from "./usage-chart";
import { UsagePeriodCard } from "./usage-period-card";

// Helper to cast database limits to expected type
const asLimitCardProps = (limit: unknown) =>
	limit as React.ComponentProps<typeof LimitCard>["limit"];

export function UserDashboard() {
	// Get user's limits
	const { data: limitsData, isLoading: limitsLoading } =
		api.limits.getForUser.useQuery({});

	// Get user's usage statistics
	const { data: usageStats, isLoading: usageLoading } =
		api.limits.getUsageStats.useQuery({});

	// Get dashboard usage metrics (daily/weekly/monthly)
	const { data: dashboardUsage, isLoading: dashboardUsageLoading } =
		api.limits.getDashboardUsage.useQuery({});

	// Get recent bookings
	const { data: recentBookings = [], isLoading: bookingsLoading } =
		api.bookings.list.useQuery({
			limit: 5,
		});

	if (
		limitsLoading ||
		usageLoading ||
		dashboardUsageLoading ||
		bookingsLoading
	) {
		return <div>Loading dashboard...</div>;
	}

	const totalLimits = limitsData
		? limitsData.userLimits.length + 1 // +1 for system defaults
		: 1; // system defaults always present

	// Filter recent bookings to show only relevant statuses
	const filteredBookings = recentBookings.filter((booking) =>
		["approved", "active", "completed"].includes(booking.status),
	);

	return (
		<div className="space-y-6">
			{/* Overview Cards */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="font-medium text-sm">Active Limits</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl text-blue-600">
							{totalLimits}
						</div>
						<p className="text-muted-foreground text-xs">
							Resource usage limits
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="font-medium text-sm">
							Monthly Hours Used
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl text-green-600">
							{usageStats?.totalHours?.toFixed(1) || "0"}
						</div>
						<p className="text-muted-foreground text-xs">
							{usageStats?.totalBookings || 0} bookings this month
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="font-medium text-sm">
							Average Duration
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl text-orange-600">
							{usageStats?.averageBookingDuration?.toFixed(1) || "0"}h
						</div>
						<p className="text-muted-foreground text-xs">Per booking</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="font-medium text-sm">
							Active Bookings
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl text-purple-600">
							{filteredBookings.filter((b) => b.status === "active").length}
						</div>
						<p className="text-muted-foreground text-xs">Currently running</p>
					</CardContent>
				</Card>
			</div>

			{/* Usage Period Cards */}
			{dashboardUsage && (
				<div>
					<h2 className="mb-4 font-semibold text-lg">Usage Summary</h2>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						<UsagePeriodCard data={dashboardUsage.daily} />
						<UsagePeriodCard data={dashboardUsage.weekly} />
						<UsagePeriodCard data={dashboardUsage.monthly} />
					</div>
				</div>
			)}

			{/* Main Content Grid */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				{/* Limits Section */}
				<div className="space-y-6 lg:col-span-2">
					{/* Your Limits */}
					<Card>
						<CardHeader>
							<CardTitle>Your Resource Limits</CardTitle>
							<CardDescription>
								Current limits affecting your resource usage
							</CardDescription>
						</CardHeader>
						<CardContent>
							{limitsData && totalLimits > 0 ? (
								<div className="space-y-4">
									{/* User-specific limits */}
									{limitsData.userLimits.length > 0 && (
										<div>
											<div className="mb-3 flex items-center gap-2">
												<User className="h-4 w-4 text-blue-500" />
												<h4 className="font-medium">Personal Limits</h4>
											</div>
											<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
												{limitsData.userLimits.map((limit) => (
													<LimitCard
														key={limit.id}
														limit={asLimitCardProps(limit)}
													/>
												))}
											</div>
										</div>
									)}

									{/* System defaults */}
									{limitsData.systemDefaults && (
										<div>
											<div className="mb-3 flex items-center gap-2">
												<Settings className="h-4 w-4 text-blue-500" />
												<h4 className="font-medium">System Default Limits</h4>
											</div>
											<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
												<LimitCard
													limit={asLimitCardProps(limitsData.systemDefaults)}
												/>
											</div>
										</div>
									)}
								</div>
							) : (
								<div className="flex flex-col items-center justify-center py-8 text-center">
									<Settings className="mb-2 h-8 w-8 text-muted-foreground" />
									<div className="text-muted-foreground">
										No limits configured
									</div>
									<div className="text-muted-foreground text-sm">
										You have unlimited access to available resources
									</div>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Usage Chart */}
					<Card>
						<CardHeader>
							<CardTitle>Usage Overview</CardTitle>
							<CardDescription>
								Your resource usage by type this month
							</CardDescription>
						</CardHeader>
						<CardContent>
							{usageStats && Object.keys(usageStats.byResource).length > 0 ? (
								<UsageChart data={usageStats.byResource} />
							) : (
								<div className="flex flex-col items-center justify-center py-8 text-center">
									<TrendingUp className="mb-2 h-8 w-8 text-muted-foreground" />
									<div className="text-muted-foreground">No usage data</div>
									<div className="text-muted-foreground text-sm">
										Start making bookings to see your usage statistics
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Recent Activity Sidebar */}
				<div className="space-y-6">
					{/* Recent Bookings */}
					<Card>
						<CardHeader>
							<CardTitle>Recent Bookings</CardTitle>
							<CardDescription>
								Your latest resource reservations
							</CardDescription>
						</CardHeader>
						<CardContent>
							{filteredBookings.length > 0 ? (
								<div className="space-y-3">
									{filteredBookings.map((booking) => (
										<div
											key={booking.id}
											className="rounded-lg border p-3 text-sm"
										>
											<div className="mb-1 flex items-center justify-between">
												<div className="font-medium">{booking.title}</div>
												<Badge
													variant={
														booking.status === "active"
															? "default"
															: booking.status === "approved"
																? "secondary"
																: "outline"
													}
													className="text-xs"
												>
													{booking.status}
												</Badge>
											</div>
											<div className="text-muted-foreground text-xs">
												{booking.resource.name} • {booking.resource.type}
											</div>
											<div className="mt-1 flex items-center gap-2 text-muted-foreground text-xs">
												<Calendar className="h-3 w-3" />
												{new Date(booking.startTime).toLocaleDateString()}
												<Clock className="h-3 w-3" />
												{new Date(booking.startTime).toLocaleTimeString([], {
													hour: "2-digit",
													minute: "2-digit",
												})}
												-
												{new Date(booking.endTime).toLocaleTimeString([], {
													hour: "2-digit",
													minute: "2-digit",
												})}
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="flex flex-col items-center justify-center py-8 text-center">
									<Calendar className="mb-2 h-8 w-8 text-muted-foreground" />
									<div className="text-muted-foreground">
										No recent bookings
									</div>
									<div className="text-muted-foreground text-sm">
										Your bookings will appear here
									</div>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Quick Stats */}
					<Card>
						<CardHeader>
							<CardTitle>Usage Summary</CardTitle>
							<CardDescription>Current month statistics</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{usageStats?.byStatus && (
								<div className="space-y-2">
									<div className="flex justify-between text-sm">
										<span>Completed</span>
										<span className="font-medium">
											{usageStats.byStatus.completed}
										</span>
									</div>
									<div className="flex justify-between text-sm">
										<span>Active</span>
										<span className="font-medium">
											{usageStats.byStatus.active}
										</span>
									</div>
									<div className="flex justify-between text-sm">
										<span>Approved</span>
										<span className="font-medium">
											{usageStats.byStatus.approved}
										</span>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
