"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Participant {
	id: string;
	name: string | null;
	image: string | null;
}

interface AvatarStackProps {
	participants: Participant[];
	maxVisible?: number;
	size?: "sm" | "md" | "lg";
	className?: string;
}

export function AvatarStack({
	participants,
	maxVisible = 3,
	size = "sm",
	className,
}: AvatarStackProps) {
	const visibleParticipants = participants.slice(0, maxVisible);
	const remainingCount = Math.max(0, participants.length - maxVisible);

	const sizeClasses = {
		sm: "h-6 w-6",
		md: "h-8 w-8",
		lg: "h-10 w-10",
	};

	const getInitials = (name: string | null) => {
		if (!name) return "?";
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	if (participants.length === 0) {
		return (
			<div className="flex items-center gap-1 text-muted-foreground text-sm">
				0 participants
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2">
			<div
				className={cn(
					"-space-x-2 flex *:ring-2 *:ring-background *:grayscale",
					className,
				)}
			>
				{visibleParticipants.map((participant) => (
					<Avatar key={participant.id} className={sizeClasses[size]}>
						<AvatarImage
							src={participant.image ?? undefined}
							alt={participant.name ?? "User"}
						/>
						<AvatarFallback className="text-xs">
							{getInitials(participant.name)}
						</AvatarFallback>
					</Avatar>
				))}
				{remainingCount > 0 && (
					<Avatar className={sizeClasses[size]}>
						<AvatarFallback className="bg-muted text-xs">
							+{remainingCount}
						</AvatarFallback>
					</Avatar>
				)}
			</div>
			<span className="text-muted-foreground text-sm">
				{participants.length} participant{participants.length !== 1 ? "s" : ""}
			</span>
		</div>
	);
}
