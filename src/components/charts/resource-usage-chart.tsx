"use client";

import {
	Line,
	LineChart,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from "recharts";

import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";

interface UsageData {
	hour: string;
	hourLabel: string;
	usage: number;
	totalCapacity: number;
	utilizationPercent: number;
}

interface ResourceUsageChartProps {
	data: UsageData[];
	totalCapacity: number;
	capacityUnit: string;
	className?: string;
}

const chartConfig = {
	utilizationPercent: {
		label: "Utilization",
		color: "hsl(var(--chart-1))",
	},
} satisfies ChartConfig;

export function ResourceUsageChart({ 
	data, 
	totalCapacity, 
	capacityUnit,
	className = "h-[200px]"
}: ResourceUsageChartProps) {
	if (data.length === 0) {
		return (
			<div className={`flex items-center justify-center ${className}`}>
				<p className="text-sm text-muted-foreground">No usage data</p>
			</div>
		);
	}

	return (
		<div className={className}>
			<ChartContainer config={chartConfig}>
				<ResponsiveContainer width="100%" height="100%">
					<LineChart
						data={data}
						margin={{
							top: 5,
							right: 5,
							left: 5,
							bottom: 5,
						}}
					>
						<XAxis
							dataKey="hourLabel"
							tickLine={false}
							axisLine={false}
							tickMargin={4}
							tick={{ fontSize: 9 }}
							interval={Math.floor(data.length / 4)} // Show ~4 ticks
						/>
						<YAxis
							domain={[0, 100]}
							tickLine={false}
							axisLine={false}
							tickMargin={4}
							tick={{ fontSize: 9 }}
							width={25}
						/>
						<ChartTooltip
							cursor={false}
							content={<ChartTooltipContent 
								labelFormatter={(value) => `Time: ${value}`}
								formatter={(value) => [
									`${value}%`,
									'Utilization'
								]}
							/>}
						/>
						<Line
							type="monotone"
							dataKey="utilizationPercent"
							stroke="var(--color-utilizationPercent)"
							strokeWidth={2}
							dot={{ r: 1.5 }}
							activeDot={{ r: 3 }}
						/>
					</LineChart>
				</ResponsiveContainer>
			</ChartContainer>
		</div>
	);
}