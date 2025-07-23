"use client";

import {
	Bar,
	BarChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface UsageChartProps {
	data: Record<
		string,
		{
			count: number;
			hours: number;
			resource: {
				id: string;
				name: string;
				type: string;
			};
		}
	>;
}

export function UsageChart({ data }: UsageChartProps) {
	const chartData = Object.entries(data).map(([name, stats]) => ({
		name: stats.resource.name,
		type: stats.resource.type,
		hours: Math.round(stats.hours * 10) / 10, // Round to 1 decimal place
		bookings: stats.count,
	}));

	const CustomTooltip = ({ active, payload, label }: any) => {
		if (active && payload && payload.length) {
			const data = payload[0].payload;
			return (
				<div className="rounded-lg border bg-background p-3 shadow-md">
					<p className="font-medium">{label}</p>
					<p className="text-muted-foreground text-sm">{data.type}</p>
					<div className="mt-2 space-y-1">
						<p className="text-sm">
							<span className="text-blue-600">{data.hours}h</span> total usage
						</p>
						<p className="text-sm">
							<span className="text-green-600">{data.bookings}</span> bookings
						</p>
					</div>
				</div>
			);
		}
		return null;
	};

	if (chartData.length === 0) {
		return (
			<div className="flex h-[200px] items-center justify-center text-muted-foreground">
				No usage data available
			</div>
		);
	}

	return (
		<div className="h-[300px] w-full">
			<ResponsiveContainer width="100%" height="100%">
				<BarChart
					data={chartData}
					margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
				>
					<XAxis
						dataKey="name"
						fontSize={12}
						tickLine={false}
						axisLine={false}
						className="fill-muted-foreground"
					/>
					<YAxis
						fontSize={12}
						tickLine={false}
						axisLine={false}
						className="fill-muted-foreground"
					/>
					<Tooltip content={<CustomTooltip />} />
					<Bar
						dataKey="hours"
						fill="hsl(var(--primary))"
						radius={[4, 4, 0, 0]}
						className="fill-primary"
					/>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
