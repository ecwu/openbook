"use client";

import { AvatarStack } from "@/components/ui/avatar-stack";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LiveCountdown } from "./live-countdown";

interface UpcomingEventsProps {
	isLoggedIn?: boolean;
}

export function UpcomingEvents({ isLoggedIn = false }: UpcomingEventsProps) {
	const {
		data: upcomingEvents,
		isLoading,
		refetch,
	} = api.events.getUpcoming.useQuery();
	const { data: myEvents } = api.events.getMyEvents.useQuery(undefined, {
		enabled: isLoggedIn,
	});

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

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="font-semibold text-2xl">Upcoming Deadlines</h2>
					<Link href="/events" className="text-primary text-sm hover:underline">
						View all
					</Link>
				</div>
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Event</TableHead>
								<TableHead>Deadline</TableHead>
								<TableHead>Time Left</TableHead>
								<TableHead>Participants</TableHead>
								<TableHead>Action</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							<TableRow>
								<TableCell
									colSpan={5}
									className="py-8 text-center text-muted-foreground"
								>
									Loading upcoming events...
								</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</div>
			</div>
		);
	}

	if (!upcomingEvents || upcomingEvents.length === 0) {
		return (
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="font-semibold text-2xl">Upcoming Deadlines</h2>
					<Link href="/events" className="text-primary text-sm hover:underline">
						View all
					</Link>
				</div>
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Event</TableHead>
								<TableHead>Deadline</TableHead>
								<TableHead>Time Left</TableHead>
								<TableHead>Participants</TableHead>
								<TableHead>Action</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							<TableRow>
								<TableCell
									colSpan={5}
									className="py-8 text-center text-muted-foreground"
								>
									No upcoming events. Create one to track deadlines and see
									who's working on them.
								</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="font-semibold text-2xl">Upcoming Deadlines</h2>
				<Link href="/events" className="text-primary text-sm hover:underline">
					View all
				</Link>
			</div>
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Event</TableHead>
							<TableHead>Deadline</TableHead>
							<TableHead>Time Left</TableHead>
							<TableHead>Participants</TableHead>
							{isLoggedIn && <TableHead>Action</TableHead>}
						</TableRow>
					</TableHeader>
					<TableBody>
						{upcomingEvents.map((event) => (
							<TableRow key={event.id}>
								<TableCell className="font-medium">{event.name}</TableCell>
								<TableCell>
									{format(event.deadline, "MMM d, yyyy 'at' h:mm a")}
								</TableCell>
								<TableCell>
									<LiveCountdown deadline={event.deadline} />
								</TableCell>
								<TableCell>
									<AvatarStack
										participants={event.participants}
										maxVisible={3}
									/>
								</TableCell>
								{isLoggedIn && (
									<TableCell>
										<Button
											variant={
												isParticipating(event.id) ? "secondary" : "default"
											}
											size="sm"
											onClick={() =>
												handleJoinLeave(event.id, isParticipating(event.id))
											}
											disabled={
												joinMutation.isPending || leaveMutation.isPending
											}
										>
											{isParticipating(event.id) ? "Leave" : "Join"}
										</Button>
									</TableCell>
								)}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
