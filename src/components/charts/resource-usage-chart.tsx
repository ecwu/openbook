"use client";

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

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
	hideAxes?: boolean;
}

const chartConfig = {
	utilizationPercent: {
		label: "Utilization",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

export function ResourceUsageChart({
	data,
	totalCapacity,
	capacityUnit,
	className = "h-[40px]",
	hideAxes = false,
}: ResourceUsageChartProps) {
	if (data.length === 0) {
		return (
			<div className={`flex items-center justify-center ${className}`}>
				<p className="text-muted-foreground text-sm">No usage data</p>
			</div>
		);
	}

	const maxValue = Math.max(...data.map((d) => d.utilizationPercent));
	const yAxisDomain =
		maxValue === 0 ? [0, 10] : [0, Math.max(100, maxValue * 1.1)];

	return (
		<div className={className}>
			<ChartContainer config={chartConfig}>
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart
						data={data}
						margin={{
							top: 0,
							right: 0,
							left: 0,
							bottom: 0,
						}}
					>
						<XAxis
							dataKey="hourLabel"
							tickLine={false}
							axisLine={false}
							tickMargin={4}
							tick={hideAxes ? false : { fontSize: 9 }}
							interval={Math.floor(data.length / 4)} // Show ~4 ticks
						/>
						<YAxis
							domain={yAxisDomain}
							tickLine={false}
							axisLine={false}
							tickMargin={4}
							tick={hideAxes ? false : { fontSize: 9 }}
							width={hideAxes ? 0 : 25}
						/>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									labelFormatter={(value) => `Time: ${value}`}
									formatter={(value) => [`${value}%`, "Utilization"]}
								/>
							}
						/>
						<Area
							type="monotone"
							dataKey="utilizationPercent"
							stroke="gray"
							strokeWidth={2}
							fill="lightgray"
							fillOpacity={0.3}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</ChartContainer>
		</div>
	);
}
