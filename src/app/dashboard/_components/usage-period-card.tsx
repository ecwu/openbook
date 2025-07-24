"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	formatUsageHours,
	getPeriodDescription,
	getPeriodDisplayName,
} from "@/lib/usage-utils";
import { Calendar, Clock, TrendingUp } from "lucide-react";

interface UsagePeriodData {
	period: "daily" | "weekly" | "monthly";
	dateRange: {
		startDate: Date;
		endDate: Date;
	};
	totalBookings: number;
	totalHours: number;
	activeBookings: number;
	completedBookings: number;
}

interface UsagePeriodCardProps {
	data: UsagePeriodData;
	className?: string;
}

export function UsagePeriodCard({
	data,
	className = "",
}: UsagePeriodCardProps) {
	const {
		period,
		dateRange,
		totalBookings,
		totalHours,
		activeBookings,
		completedBookings,
	} = data;

	// Choose color scheme based on period
	const colorScheme = {
		daily: "text-blue-600",
		weekly: "text-green-600",
		monthly: "text-purple-600",
	}[period];

	const iconMap = {
		daily: Clock,
		weekly: Calendar,
		monthly: TrendingUp,
	};

	const Icon = iconMap[period];

	return (
		<Card className={className}>
			<CardHeader className="pb-2">
				<div className="flex items-center gap-2">
					<Icon className="h-4 w-4 text-muted-foreground" />
					<CardTitle className="font-medium text-sm">
						{getPeriodDisplayName(period)} Usage
					</CardTitle>
				</div>
				<CardDescription className="text-xs">
					{getPeriodDescription(period, dateRange.startDate, dateRange.endDate)}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className={`font-bold text-2xl ${colorScheme}`}>
					{formatUsageHours(totalHours)}h
				</div>
				<div className="mt-1 flex items-center gap-3 text-muted-foreground text-xs">
					<span>{totalBookings} bookings</span>
					{activeBookings > 0 && <span>{activeBookings} active</span>}
				</div>
				<div className="mt-2 text-muted-foreground text-xs">
					{completedBookings} completed
				</div>
			</CardContent>
		</Card>
	);
}
