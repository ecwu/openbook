"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/trpc/react";
import {
  Filter,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { useState } from "react";
import { CreateLimitDialog } from "./create-limit-dialog";
import { DeleteLimitDialog } from "./delete-limit-dialog";
import { EditLimitDialog } from "./edit-limit-dialog";

interface Limit {
  id: string;
  name: string;
  description?: string | null;
  limitType: "group" | "user" | "group_per_person";
  targetId: string;
  resourceId?: string | null;
  maxHoursPerDay?: number | null;
  maxHoursPerWeek?: number | null;
  maxHoursPerMonth?: number | null;
  maxConcurrentBookings?: number | null;
  maxBookingsPerDay?: number | null;
  allowedBookingTypes?: unknown;
  allowedTimeSlots?: unknown;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date | null;
  resource?: {
    id: string;
    name: string;
    type: string;
  } | null;
  createdBy: {
    id: string;
    name: string | null;
  };
  target?:
    | {
        id: string;
        name: string | null;
        email: string;
      }
    | {
        id: string;
        name: string;
        description: string | null;
      }
    | null;
}

// Helper function to cast database limits to our strict Limit type
const asLimit = (limit: unknown): Limit => limit as Limit;

export function LimitManagementPanel() {
  const [search, setSearch] = useState("");
  const [limitTypeFilter, setLimitTypeFilter] = useState<string>("all");
  const [isActiveFilter, setIsActiveFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingLimit, setEditingLimit] = useState<Limit | null>(null);
  const [deletingLimit, setDeletingLimit] = useState<Limit | null>(null);

  const {
    data: limits = [],
    isLoading,
    refetch,
  } = api.limits.list.useQuery({
    limitType:
      limitTypeFilter === "all"
        ? undefined
        : (limitTypeFilter as "group" | "user" | "group_per_person"),
    isActive:
      isActiveFilter === "all" ? undefined : isActiveFilter === "active",
    limit: 50,
  });

  const handleRefresh = () => {
    void refetch();
  };

  const getLimitTypeIcon = (type: string) => {
    switch (type) {
      case "user":
        return <User className="h-4 w-4" />;
      case "group":
        return <Users className="h-4 w-4" />;
      case "group_per_person":
        return <Settings className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const getLimitTypeColor = (type: string) => {
    switch (type) {
      case "user":
        return "bg-blue-500";
      case "group":
        return "bg-green-500";
      case "group_per_person":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatLimitSummary = (limit: Limit) => {
    const parts = [];
    if (limit.maxHoursPerDay) parts.push(`${limit.maxHoursPerDay}h/day`);
    if (limit.maxHoursPerWeek) parts.push(`${limit.maxHoursPerWeek}h/week`);
    if (limit.maxHoursPerMonth) parts.push(`${limit.maxHoursPerMonth}h/month`);
    if (limit.maxConcurrentBookings)
      parts.push(`${limit.maxConcurrentBookings} concurrent`);
    if (limit.maxBookingsPerDay)
      parts.push(`${limit.maxBookingsPerDay} bookings/day`);
    return parts.length > 0 ? parts.join(", ") : "No limits set";
  };

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
            <Input
              placeholder="Search limits..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={limitTypeFilter} onValueChange={setLimitTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="user">User Limits</SelectItem>
              <SelectItem value="group">Group Limits</SelectItem>
              <SelectItem value="group_per_person">Group Per Person</SelectItem>
            </SelectContent>
          </Select>
          <Select value={isActiveFilter} onValueChange={setIsActiveFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <Filter className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Limit
          </Button>
        </div>
      </div>

      {/* Limits Overview Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Total Limits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{limits.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">User Limits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-blue-600">
              {limits.filter((l) => l.limitType === "user").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Group Limits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-green-600">
              {limits.filter((l) => l.limitType === "group").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Active Limits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-orange-600">
              {limits.filter((l) => l.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Limits Table */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Limits</CardTitle>
          <CardDescription>
            Manage resource usage limits for users and groups
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading limits...</div>
            </div>
          ) : limits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="mb-2 text-muted-foreground">No limits found</div>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Limit
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Limits</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {limits.map((limit) => (
                    <TableRow key={limit.id}>
                      <TableCell className="font-medium">
                        <div className="space-y-1">
                          <div>{limit.name}</div>
                          {limit.description && (
                            <div className="line-clamp-1 text-muted-foreground text-xs">
                              {limit.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${getLimitTypeColor(
                              limit.limitType
                            )}`}
                          />
                          <div className="flex items-center gap-1">
                            {getLimitTypeIcon(limit.limitType)}
                            <span className="capitalize">
                              {limit.limitType.replace("_", " ")}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {limit.target?.name ||
                              (limit.target && "email" in limit.target
                                ? limit.target.email
                                : undefined) ||
                              "Unknown"}
                          </div>
                          {limit.target &&
                            "email" in limit.target &&
                            limit.target?.name && (
                              <div className="text-muted-foreground text-xs">
                                {limit.target.email}
                              </div>
                            )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {limit.resource ? (
                          <div className="space-y-1">
                            <div className="font-medium">
                              {limit.resource.name}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {limit.resource.type}
                            </div>
                          </div>
                        ) : (
                          <Badge variant="outline">Global</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <div className="text-muted-foreground text-sm">
                            {formatLimitSummary(asLimit(limit))}
                          </div>
                          {limit.priority > 0 && (
                            <div className="mt-1">
                              <Badge variant="secondary" className="text-xs">
                                Priority: {limit.priority}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              limit.isActive ? "bg-green-500" : "bg-gray-500"
                            }`}
                          />
                          <Badge
                            variant={limit.isActive ? "default" : "secondary"}
                          >
                            {limit.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setEditingLimit(asLimit(limit))}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingLimit(asLimit(limit))}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateLimitDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleRefresh}
      />

      <EditLimitDialog
        open={!!editingLimit}
        onOpenChange={(open) => !open && setEditingLimit(null)}
        limit={editingLimit}
        onSuccess={handleRefresh}
      />

      <DeleteLimitDialog
        open={!!deletingLimit}
        onOpenChange={(open) => !open && setDeletingLimit(null)}
        limit={deletingLimit}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
