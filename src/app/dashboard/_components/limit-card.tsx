"use client";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Settings, Zap } from "lucide-react";

interface LimitCardProps {
	limit: {
		id: string;
		name: string;
		description?: string | null;
		limitType: "user";
		resourceId?: string | null;
		maxHoursPerDay?: number | null;
		maxHoursPerWeek?: number | null;
		maxHoursPerMonth?: number | null;
		maxConcurrentBookings?: number | null;
		maxBookingsPerDay?: number | null;
		priority: number;
		isActive: boolean;
		resource?: {
			id: string;
			name: string;
			type: string;
		} | null;
	};
}

export function LimitCard({ limit }: LimitCardProps) {
	const formatLimitValue = (value: number | null | undefined, unit: string) => {
		if (value === null || value === undefined) return null;
		return `${value} ${unit}`;
	};

	const getLimitIcon = () => {
		if (limit.maxConcurrentBookings || limit.maxBookingsPerDay) {
			return <Zap className="h-4 w-4" />;
		}
		return <Clock className="h-4 w-4" />;
	};

	const getLimitSummary = () => {
		const parts = [];
		if (limit.maxHoursPerDay)
			parts.push(formatLimitValue(limit.maxHoursPerDay, "h/day"));
		if (limit.maxHoursPerWeek)
			parts.push(formatLimitValue(limit.maxHoursPerWeek, "h/week"));
		if (limit.maxHoursPerMonth)
			parts.push(formatLimitValue(limit.maxHoursPerMonth, "h/month"));
		if (limit.maxConcurrentBookings)
			parts.push(formatLimitValue(limit.maxConcurrentBookings, "concurrent"));
		if (limit.maxBookingsPerDay)
			parts.push(formatLimitValue(limit.maxBookingsPerDay, "bookings/day"));

		return parts.length > 0 ? parts.join(", ") : "No specific limits";
	};

	const getLimitTypeColor = () => {
		switch (limit.limitType) {
			case "user":
				return "bg-blue-100 text-blue-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	return (
		<div className="rounded-lg border bg-card p-4">
			<div className="mb-3 flex items-start justify-between">
				<div className="flex items-center gap-2">
					{getLimitIcon()}
					<div>
						<h5 className="font-medium">{limit.name}</h5>
						{limit.resource && (
							<div className="text-muted-foreground text-xs">
								{limit.resource.name} ({limit.resource.type})
							</div>
						)}
					</div>
				</div>
				<div className="flex flex-col items-end gap-1">
					<Badge className={`text-xs ${getLimitTypeColor()}`} variant="outline">
						{limit.limitType.replace("_", " ")}
					</Badge>
					{limit.priority > 0 && (
						<Badge variant="secondary" className="text-xs">
							Priority: {limit.priority}
						</Badge>
					)}
				</div>
			</div>

			<div className="space-y-2">
				<div className="text-muted-foreground text-sm">{getLimitSummary()}</div>

				{limit.description && (
					<div className="text-muted-foreground text-xs">
						{limit.description}
					</div>
				)}

				{!limit.isActive && (
					<Badge variant="destructive" className="text-xs">
						Inactive
					</Badge>
				)}
			</div>
		</div>
	);
}
