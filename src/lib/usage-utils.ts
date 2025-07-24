/**
 * Utility functions for calculating usage periods and formatting usage data
 */

export type UsagePeriod = "daily" | "weekly" | "monthly";

/**
 * Get date range for natural periods
 */
export function getUsagePeriodRange(
	period: UsagePeriod,
	date: Date = new Date(),
) {
	const today = new Date(date);

	switch (period) {
		case "daily": {
			// Today from 00:00:00 to 23:59:59
			const startOfDay = new Date(
				today.getFullYear(),
				today.getMonth(),
				today.getDate(),
			);
			const endOfDay = new Date(
				today.getFullYear(),
				today.getMonth(),
				today.getDate(),
				23,
				59,
				59,
				999,
			);
			return { startDate: startOfDay, endDate: endOfDay };
		}

		case "weekly": {
			// Natural week: Sunday to Saturday
			const startOfWeek = new Date(today);
			startOfWeek.setDate(today.getDate() - today.getDay());
			startOfWeek.setHours(0, 0, 0, 0);

			const endOfWeek = new Date(startOfWeek);
			endOfWeek.setDate(startOfWeek.getDate() + 6);
			endOfWeek.setHours(23, 59, 59, 999);

			return { startDate: startOfWeek, endDate: endOfWeek };
		}

		case "monthly": {
			// Natural month: 1st to last day of month
			const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
			const endOfMonth = new Date(
				today.getFullYear(),
				today.getMonth() + 1,
				0,
				23,
				59,
				59,
				999,
			);
			return { startDate: startOfMonth, endDate: endOfMonth };
		}

		default:
			throw new Error(`Invalid usage period: ${period}`);
	}
}

/**
 * Format usage hours with appropriate precision
 */
export function formatUsageHours(hours: number): string {
	if (hours === 0) return "0";
	if (hours < 0.1) return "<0.1";
	if (hours < 1) return hours.toFixed(1);
	if (hours < 10) return hours.toFixed(1);
	return Math.round(hours).toString();
}

/**
 * Get period display name
 */
export function getPeriodDisplayName(period: UsagePeriod): string {
	switch (period) {
		case "daily":
			return "Today";
		case "weekly":
			return "This Week";
		case "monthly":
			return "This Month";
		default:
			return period;
	}
}

/**
 * Get period description for date range
 */
export function getPeriodDescription(
	period: UsagePeriod,
	startDate: Date,
	endDate: Date,
): string {
	const formatDate = (date: Date) =>
		date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});

	switch (period) {
		case "daily":
			return formatDate(startDate);
		case "weekly":
			return `${formatDate(startDate)} - ${formatDate(endDate)}`;
		case "monthly":
			return startDate.toLocaleDateString("en-US", {
				month: "long",
				year: "numeric",
			});
		default:
			return `${formatDate(startDate)} - ${formatDate(endDate)}`;
	}
}
