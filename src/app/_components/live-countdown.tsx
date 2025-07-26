"use client";

import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

interface LiveCountdownProps {
	deadline: Date;
}

export function LiveCountdown({ deadline }: LiveCountdownProps) {
	const [timeLeft, setTimeLeft] = useState("");
	const [variant, setVariant] = useState<
		"default" | "secondary" | "destructive"
	>("default");

	useEffect(() => {
		const updateCountdown = () => {
			const now = new Date();
			const diff = deadline.getTime() - now.getTime();

			if (diff < 0) {
				setTimeLeft("Expired");
				setVariant("destructive");
				return;
			}

			const days = Math.floor(diff / (1000 * 60 * 60 * 24));
			const hours = Math.floor(
				(diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
			);
			const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
			const seconds = Math.floor((diff % (1000 * 60)) / 1000);

			// Update variant based on time remaining
			const totalHours = diff / (1000 * 60 * 60);
			if (totalHours < 24) {
				setVariant("destructive");
			} else if (totalHours < 72) {
				setVariant("secondary");
			} else {
				setVariant("default");
			}

			// Format time left
			if (days > 0) {
				setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
			} else if (hours > 0) {
				setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
			} else if (minutes > 0) {
				setTimeLeft(`${minutes}m ${seconds}s`);
			} else {
				setTimeLeft(`${seconds}s`);
			}
		};

		// Update immediately
		updateCountdown();

		// Update every second
		const interval = setInterval(updateCountdown, 1000);

		return () => clearInterval(interval);
	}, [deadline]);

	return (
		<Badge variant={variant} className="font-mono">
			{timeLeft}
		</Badge>
	);
}
