"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const editUserSchema = z.object({
	name: z.string().min(1, "Name is required").max(255),
	role: z.enum(["admin", "user"]),
	isActive: z.boolean(),
});

type EditUserForm = z.infer<typeof editUserSchema>;

interface EditUserDialogProps {
	userId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function EditUserDialog({
	userId,
	open,
	onOpenChange,
}: EditUserDialogProps) {
	const utils = api.useUtils();

	const { data: user, isLoading } = api.users.getById.useQuery(
		{ id: userId },
		{ enabled: open },
	);

	const updateUser = api.users.update.useMutation({
		onSuccess: () => {
			toast.success("User updated successfully");
			utils.users.list.invalidate();
			onOpenChange(false);
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const form = useForm<EditUserForm>({
		resolver: zodResolver(editUserSchema),
		defaultValues: {
			name: "",
			role: "user",
			isActive: true,
		},
	});

	useEffect(() => {
		if (user) {
			form.reset({
				name: user.name || "",
				role: user.role as "admin" | "user",
				isActive: user.isActive,
			});
		}
	}, [user, form]);

	const onSubmit = (data: EditUserForm) => {
		updateUser.mutate({
			id: userId,
			...data,
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Edit User</DialogTitle>
				</DialogHeader>

				{isLoading ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-6 w-6 animate-spin" />
					</div>
				) : (
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Name</FormLabel>
										<FormControl>
											<Input {...field} placeholder="Enter user name" />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="role"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Role</FormLabel>
										<Select onValueChange={field.onChange} value={field.value}>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select role" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="user">User</SelectItem>
												<SelectItem value="admin">Admin</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="isActive"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
										<div className="space-y-0.5">
											<FormLabel className="text-base">Active Status</FormLabel>
											<div className="text-muted-foreground text-sm">
												Enable or disable user account
											</div>
										</div>
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
									</FormItem>
								)}
							/>

							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => onOpenChange(false)}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={updateUser.isPending}>
									{updateUser.isPending && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									Save Changes
								</Button>
							</DialogFooter>
						</form>
					</Form>
				)}
			</DialogContent>
		</Dialog>
	);
}
