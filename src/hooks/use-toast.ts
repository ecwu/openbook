"use client";

import type * as React from "react";
import { toast as sonnerToast } from "sonner";

type ToastActionElement = React.ReactElement;

type ToastProps = {
	title?: React.ReactNode;
	description?: React.ReactNode;
	action?: ToastActionElement;
	variant?: "default" | "destructive";
	duration?: number;
};

export const useToast = () => {
	return {
		toast: ({
			title,
			description,
			variant = "default",
			...props
		}: ToastProps) => {
			if (variant === "destructive") {
				return sonnerToast.error(title as string, {
					description: description as string,
					...props,
				});
			}

			return sonnerToast.success(title as string, {
				description: description as string,
				...props,
			});
		},
		dismiss: sonnerToast.dismiss,
	};
};
