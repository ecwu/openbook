"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";
import { ResourceUsageChart } from "@/components/charts/resource-usage-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface ResourceWithUsage {
	id: string;
	name: string;
	type: string;
	description?: string | null;
	status: "available" | "maintenance" | "offline";
	totalCapacity: number;
	capacityUnit: string;
	currentUtilization: number;
	availableCapacity: number;
	utilizationPercentage: number;
	isIndivisible: boolean;
	isActive: boolean;
}

function ResourceCard({ resource, usageData }: { resource: ResourceWithUsage; usageData: any[] }) {
	const getStatusColor = (status: string) => {
		switch (status) {
			case "available":
				return "bg-green-100 text-green-800";
			case "maintenance":
				return "bg-yellow-100 text-yellow-800";
			case "offline":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const getUtilizationColor = (percentage: number) => {
		if (percentage >= 90) return "text-red-600";
		if (percentage >= 70) return "text-yellow-600";
		return "text-green-600";
	};

	return (
		<Card className="transition-shadow hover:shadow-md">
			<CardHeader className="pb-4">
				<div className="flex items-start justify-between">
					<div className="space-y-1">
						<CardTitle className="text-lg">{resource.name}</CardTitle>
						<div className="flex items-center gap-2">
							<Badge variant="outline">{resource.type}</Badge>
							<Badge className={getStatusColor(resource.status)}>
								{resource.status}
							</Badge>
							{!resource.isActive && (
								<Badge variant="destructive">Disabled</Badge>
							)}
							{resource.isIndivisible && (
								<Badge variant="secondary">Indivisible</Badge>
							)}
						</div>
					</div>
				</div>
				{resource.description && (
					<p className="text-sm text-muted-foreground">{resource.description}</p>
				)}
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid grid-cols-2 gap-4 text-sm">
					<div>
						<p className="text-muted-foreground">Total Capacity</p>
						<p className="font-medium">
							{resource.totalCapacity} {resource.capacityUnit}
						</p>
					</div>
					<div>
						<p className="text-muted-foreground">Available</p>
						<p className="font-medium">
							{resource.availableCapacity} {resource.capacityUnit}
						</p>
					</div>
					<div>
						<p className="text-muted-foreground">Current Usage</p>
						<p className="font-medium">
							{resource.currentUtilization} {resource.capacityUnit}
						</p>
					</div>
					<div>
						<p className="text-muted-foreground">Utilization</p>
						<p className={`font-medium ${getUtilizationColor(resource.utilizationPercentage)}`}>
							{resource.utilizationPercentage.toFixed(1)}%
						</p>
					</div>
				</div>
				
				<Separator />
				
				<div className="space-y-2">
					<h4 className="text-sm font-medium">24-Hour Usage Forecast</h4>
					{usageData.length > 0 ? (
						<ResourceUsageChart
							data={usageData}
							totalCapacity={resource.totalCapacity}
							capacityUnit={resource.capacityUnit}
							className="h-[120px]"
						/>
					) : (
						<div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground">
							No usage data available
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

function ResourcesSkeleton() {
	return (
		<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{Array.from({ length: 6 }).map((_, i) => (
				<Card key={i}>
					<CardHeader>
						<Skeleton className="h-6 w-3/4" />
						<div className="flex gap-2">
							<Skeleton className="h-5 w-16" />
							<Skeleton className="h-5 w-20" />
						</div>
						<Skeleton className="h-4 w-full" />
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							{Array.from({ length: 4 }).map((_, j) => (
								<div key={j} className="space-y-1">
									<Skeleton className="h-3 w-20" />
									<Skeleton className="h-4 w-16" />
								</div>
							))}
						</div>
						<Skeleton className="h-[120px] w-full" />
					</CardContent>
				</Card>
			))}
		</div>
	);
}

export function ResourcesPanel() {
	const { data: resources, isLoading: resourcesLoading } = api.resources.list.useQuery({
		onlyAccessible: true,
		limit: 100,
		isActive: undefined, // Include both active and inactive resources
	});

	const { data: usageData, isLoading: usageLoading } = api.resources.getNext24HourUsage.useQuery({});

	if (resourcesLoading || usageLoading) {
		return <ResourcesSkeleton />;
	}

	if (!resources || resources.length === 0) {
		return (
			<Alert>
				<AlertDescription>
					No resources are currently available for your account.
				</AlertDescription>
			</Alert>
		);
	}

	// Sort resources: active + available first, then by utilization (lowest first for available resources)
	const sortedResources = [...resources].sort((a, b) => {
		// First, sort by active status (active resources first)
		if (a.isActive && !b.isActive) return -1;
		if (!a.isActive && b.isActive) return 1;
		
		// Within active resources, sort by status (available resources first)
		if (a.isActive && b.isActive) {
			if (a.status === "available" && b.status !== "available") return -1;
			if (a.status !== "available" && b.status === "available") return 1;
			
			// Within same status, sort by utilization percentage (lower utilization first for available resources)
			if (a.status === "available" && b.status === "available") {
				return a.utilizationPercentage - b.utilizationPercentage;
			}
		}
		
		// For inactive resources or same-status resources, sort alphabetically by name
		return a.name.localeCompare(b.name);
	});

	// Create a map of usage data by resource ID for quick lookup
	const usageDataMap = new Map();
	if (usageData) {
		for (const resourceUsage of usageData) {
			usageDataMap.set(resourceUsage.resourceId, resourceUsage.hourlyData);
		}
	}

	return (
		<div className="space-y-6">
			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{sortedResources.map((resource) => (
					<ResourceCard
						key={resource.id}
						resource={resource}
						usageData={usageDataMap.get(resource.id) || []}
					/>
				))}
			</div>
		</div>
	);
}