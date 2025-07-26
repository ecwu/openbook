"use client";

import { ResourceUsageChart } from "@/components/charts/resource-usage-chart";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface ResourceWithUsage {
	id: string;
	name: string;
	type: string;
	description?: string | null;
	status: string;
	totalCapacity: number;
	capacityUnit: string;
	currentUtilization: number;
	availableCapacity: number;
	utilizationPercentage: number;
	isIndivisible: boolean;
	isActive: boolean;
}

function ResourceCard({
	resource,
	usageData,
}: {
	resource: ResourceWithUsage;
	usageData: any[];
}) {
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
					<p className="text-muted-foreground text-sm">
						{resource.description}
					</p>
				)}
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Mobile layout: vertical stack */}
				<div className="flex flex-col space-y-4 lg:hidden">
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
							<p
								className={`font-medium ${getUtilizationColor(
									resource.utilizationPercentage,
								)}`}
							>
								{resource.utilizationPercentage.toFixed(1)}%
							</p>
						</div>
					</div>

					<Separator />

					<div className="space-y-2">
						<h4 className="font-medium text-sm">24-Hour Usage Forecast</h4>
						{usageData.length > 0 ? (
							<div className="h-[120px] w-full overflow-hidden">
								<ResourceUsageChart
									data={usageData}
									totalCapacity={resource.totalCapacity}
									capacityUnit={resource.capacityUnit}
									className="h-full w-full"
								/>
							</div>
						) : (
							<div className="flex h-[120px] items-center justify-center text-muted-foreground text-sm">
								No usage data available
							</div>
						)}
					</div>
				</div>

				{/* Desktop layout: side by side */}
				<div className="hidden lg:flex lg:gap-6">
					{/* Left side: Resource info */}
					<div className="flex-1 space-y-4">
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
								<p
									className={`font-medium ${getUtilizationColor(
										resource.utilizationPercentage,
									)}`}
								>
									{resource.utilizationPercentage.toFixed(1)}%
								</p>
							</div>
						</div>
					</div>

					{/* Right side: Chart */}
					<div className="flex-1 space-y-2">
						<h4 className="font-medium text-sm">24-Hour Usage Forecast</h4>
						{usageData.length > 0 ? (
							<div className="h-[120px] w-full overflow-hidden">
								<ResourceUsageChart
									data={usageData}
									totalCapacity={resource.totalCapacity}
									capacityUnit={resource.capacityUnit}
									className="h-full w-full"
								/>
							</div>
						) : (
							<div className="flex h-[120px] items-center justify-center text-muted-foreground text-sm">
								No usage data available
							</div>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function ResourcesSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-6">
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
	const [showOfflineResources, setShowOfflineResources] = useState(false);

	const { data: resources, isLoading: resourcesLoading } =
		api.resources.list.useQuery({
			onlyAccessible: true,
			limit: 100,
			isActive: undefined, // Include both active and inactive resources
		});

	const { data: usageData, isLoading: usageLoading } =
		api.resources.getNext24HourUsage.useQuery({});

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

	// Separate online and offline resources
	const onlineResources = resources.filter(
		(resource) => resource.status !== "offline",
	);
	const offlineResources = resources.filter(
		(resource) => resource.status === "offline",
	);

	// Sort online resources: active + available first, then by utilization (lowest first for available resources)
	const sortedOnlineResources = [...onlineResources].sort((a, b) => {
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

	// Sort offline resources alphabetically by name
	const sortedOfflineResources = [...offlineResources].sort((a, b) =>
		a.name.localeCompare(b.name),
	);

	// Create a map of usage data by resource ID for quick lookup
	const usageDataMap = new Map();
	if (usageData) {
		for (const resourceUsage of usageData) {
			usageDataMap.set(resourceUsage.resourceId, resourceUsage.hourlyData);
		}
	}

	return (
		<div className="space-y-2">
			{/* Online Resources Section */}
			{sortedOnlineResources.length > 0 && (
				<div className="space-y-4">
					<h2 className="font-semibold text-xl">Available Resources</h2>
					<div className="grid grid-cols-1 gap-6">
						{sortedOnlineResources.map((resource) => (
							<ResourceCard
								key={resource.id}
								resource={resource}
								usageData={usageDataMap.get(resource.id) || []}
							/>
						))}
					</div>
				</div>
			)}

			{/* Offline Resources Section */}
			{sortedOfflineResources.length > 0 && (
				<Collapsible
					open={showOfflineResources}
					onOpenChange={setShowOfflineResources}
				>
					<CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg p-4 text-left hover:bg-muted">
						<div className="flex items-center gap-2">
							<h2 className="font-semibold text-xl">Offline Resources</h2>
							<Badge variant="secondary">{sortedOfflineResources.length}</Badge>
						</div>
						{showOfflineResources ? (
							<ChevronDown className="h-4 w-4" />
						) : (
							<ChevronRight className="h-4 w-4" />
						)}
					</CollapsibleTrigger>
					<CollapsibleContent className="space-y-4 pt-4">
						<div className="grid grid-cols-1 gap-6">
							{sortedOfflineResources.map((resource) => (
								<ResourceCard
									key={resource.id}
									resource={resource}
									usageData={usageDataMap.get(resource.id) || []}
								/>
							))}
						</div>
					</CollapsibleContent>
				</Collapsible>
			)}
		</div>
	);
}
