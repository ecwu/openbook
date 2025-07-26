"use client";

import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { CreateEventDialog } from "./create-event-dialog";
import { useState } from "react";
import { format } from "date-fns";
import { Calendar, Users, Clock } from "lucide-react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

export function EventsPanel() {
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const { data: events, refetch } = api.events.getAll.useQuery();
	const { data: myEvents } = api.events.getMyEvents.useQuery();

	const joinMutation = api.events.join.useMutation({
		onSuccess: () => {
			void refetch();
		},
	});

	const leaveMutation = api.events.leave.useMutation({
		onSuccess: () => {
			void refetch();
		},
	});

	const handleJoinLeave = (eventId: string, isParticipating: boolean) => {
		if (isParticipating) {
			leaveMutation.mutate({ eventId });
		} else {
			joinMutation.mutate({ eventId });
		}
	};

	const isParticipating = (eventId: string) => {
		return myEvents?.some((event) => event.id === eventId) ?? false;
	};

	const getTimeUntilDeadline = (deadline: Date) => {
		const now = new Date();
		const diff = deadline.getTime() - now.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

		if (diff < 0) return "Expired";
		if (days > 0) return `${days}d ${hours}h`;
		if (hours > 0) return `${hours}h`;
		return "< 1h";
	};

	const getDeadlineColor = (deadline: Date) => {
		const now = new Date();
		const diff = deadline.getTime() - now.getTime();
		const hours = diff / (1000 * 60 * 60);

		if (hours < 0) return "destructive";
		if (hours < 24) return "destructive";
		if (hours < 72) return "secondary";
		return "default";
	};

	// Combine and sort events: participating events first, then by deadline
	const sortedEvents = events
		? [...events].sort((a, b) => {
				const userInA = isParticipating(a.id);
				const userInB = isParticipating(b.id);
				
				if (userInA && !userInB) return -1;
				if (!userInA && userInB) return 1;
				
				// If both have same participation status, sort by deadline
				return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
		  })
		: [];

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div className="space-y-1">
					<h2 className="font-semibold text-2xl">All Events</h2>
					<p className="text-sm text-muted-foreground">
						{events?.length ?? 0} total events
					</p>
				</div>
				<Button onClick={() => setCreateDialogOpen(true)}>
					Create Event
				</Button>
			</div>

			{events && events.length > 0 ? (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[300px]">Event Name</TableHead>
							<TableHead>Deadline</TableHead>
							<TableHead>Time Remaining</TableHead>
							<TableHead>Participants</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sortedEvents.map((event) => {
							const participating = isParticipating(event.id);
							const isExpired = new Date(event.deadline) < new Date();
							
							return (
								<TableRow 
									key={event.id}
									className={participating ? "bg-blue-50 dark:bg-blue-950/20" : ""}
								>
									<TableCell className="font-medium">
										<div className="space-y-1">
											<div className="flex items-center gap-2">
												<span>{event.name}</span>
												{participating && (
													<Badge variant="secondary" className="text-xs">
														Participating
													</Badge>
												)}
											</div>
											{event.description && (
												<p className="text-muted-foreground text-xs line-clamp-2 max-w-[280px]">
													{event.description.split('\n')[0]}
												</p>
											)}
										</div>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-1 text-sm">
											<Calendar className="h-3 w-3" />
											<span>{format(event.deadline, "MMM d, yyyy h:mm a")}</span>
										</div>
									</TableCell>
									<TableCell>
										<Badge variant={getDeadlineColor(event.deadline)}>
											<Clock className="h-3 w-3 mr-1" />
											{getTimeUntilDeadline(event.deadline)}
										</Badge>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-2">
											<AvatarStack participants={event.participants} maxVisible={3} />
											<span className="text-sm text-muted-foreground">
												{event.participantCount}
											</span>
										</div>
									</TableCell>
									<TableCell>
										<Badge variant={isExpired ? "destructive" : "default"}>
											{isExpired ? "Expired" : "Active"}
										</Badge>
									</TableCell>
									<TableCell className="text-right">
										<Button
											variant={participating ? "secondary" : "default"}
											size="sm"
											onClick={() => handleJoinLeave(event.id, participating)}
											disabled={joinMutation.isPending || leaveMutation.isPending || isExpired}
										>
											{participating ? "Leave" : "Join"}
										</Button>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			) : (
				<div className="text-center py-8">
					<p className="text-muted-foreground">No events available yet.</p>
				</div>
			)}

			<CreateEventDialog
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
				onSuccess={() => {
					void refetch();
					setCreateDialogOpen(false);
				}}
			/>
		</div>
	);
}