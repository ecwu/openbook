"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface UsageData {
	hour: string;
	hourLabel: string;
	usage: number;
	totalCapacity: number;
	utilizationPercent: number;
}

interface ResourceUsageDebugProps {
	data: UsageData[];
	totalCapacity: number;
	capacityUnit: string;
	resourceId?: string;
	resourceName?: string;
	rawFutureUsage?: any;
	className?: string;
}

export function ResourceUsageDebug({
	data,
	totalCapacity,
	capacityUnit,
	resourceId,
	resourceName,
	rawFutureUsage,
	className,
}: ResourceUsageDebugProps) {
	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle className="text-sm">
					Debug: Resource Usage Data
					{resourceName && (
						<Badge variant="outline" className="ml-2">
							{resourceName}
						</Badge>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{/* Resource Info */}
					<div>
						<h4 className="font-medium text-sm mb-2">Resource Info:</h4>
						<div className="text-xs space-y-1 font-mono bg-muted p-2 rounded">
							<div>ID: {resourceId || 'N/A'}</div>
							<div>Name: {resourceName || 'N/A'}</div>
							<div>Total Capacity: {totalCapacity} {capacityUnit}</div>
						</div>
					</div>

					{/* Raw Future Usage */}
					{rawFutureUsage && (
						<div>
							<h4 className="font-medium text-sm mb-2">Raw Future Usage API Data:</h4>
							<div className="text-xs bg-muted p-2 rounded max-h-40 overflow-auto">
								<pre>{JSON.stringify(rawFutureUsage, null, 2)}</pre>
							</div>
						</div>
					)}

					{/* Generated Hourly Data */}
					<div>
						<h4 className="font-medium text-sm mb-2">Generated Hourly Data ({data.length} hours):</h4>
						<div className="text-xs bg-muted p-2 rounded max-h-60 overflow-auto">
							<pre>{JSON.stringify(data, null, 2)}</pre>
						</div>
					</div>

					{/* Data Summary */}
					<div>
						<h4 className="font-medium text-sm mb-2">Data Summary:</h4>
						<div className="text-xs space-y-1 font-mono bg-muted p-2 rounded">
							<div>Total Hours: {data.length}</div>
							<div>Max Usage: {Math.max(...data.map(d => d.usage))} {capacityUnit}</div>
							<div>Min Usage: {Math.min(...data.map(d => d.usage))} {capacityUnit}</div>
							<div>Max Utilization: {Math.max(...data.map(d => d.utilizationPercent))}%</div>
							<div>Min Utilization: {Math.min(...data.map(d => d.utilizationPercent))}%</div>
							<div>Non-zero Hours: {data.filter(d => d.usage > 0).length}</div>
						</div>
					</div>

					{/* First Few Data Points */}
					<div>
						<h4 className="font-medium text-sm mb-2">First 6 Data Points:</h4>
						<div className="text-xs bg-muted p-2 rounded">
							{data.slice(0, 6).map((item, index) => (
								<div key={index} className="border-b border-muted-foreground/20 last:border-b-0 py-1">
									<div><strong>{item.hourLabel}</strong> ({item.hour})</div>
									<div>Usage: {item.usage}/{item.totalCapacity} {capacityUnit} ({item.utilizationPercent}%)</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}