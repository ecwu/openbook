"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/trpc/react";
import { Calendar, Download, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

export function EventManagementPanel() {
	const { toast } = useToast();
	const [isImporting, setIsImporting] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	const batchImportMutation = api.events.batchImportConferences.useMutation({
		onSuccess: (result) => {
			toast({
				title: "Import Successful",
				description: `Imported ${result.imported} future conferences from ${result.total} total conferences.`,
			});
			setIsImporting(false);
		},
		onError: (error) => {
			toast({
				title: "Import Failed",
				description: error.message,
				variant: "destructive",
			});
			setIsImporting(false);
		},
	});

	const batchDeleteMutation = api.events.batchDeleteAllEvents.useMutation({
		onSuccess: (result) => {
			toast({
				title: "Delete Successful",
				description: `Deleted ${result.deleted} events and all associated participations.`,
			});
			setIsDeleting(false);
			setShowDeleteDialog(false);
		},
		onError: (error) => {
			toast({
				title: "Delete Failed",
				description: error.message,
				variant: "destructive",
			});
			setIsDeleting(false);
			setShowDeleteDialog(false);
		},
	});

	const handleBatchImport = async () => {
		setIsImporting(true);
		try {
			await batchImportMutation.mutateAsync();
		} catch (error) {
			// Error is handled by the onError callback above
		}
	};

	const handleBatchDelete = async () => {
		setIsDeleting(true);
		try {
			await batchDeleteMutation.mutateAsync();
		} catch (error) {
			// Error is handled by the onError callback above
		}
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Download className="h-5 w-5" />
						Batch Import Conferences
					</CardTitle>
					<CardDescription>
						Import upcoming academic conferences from AI Deadlines repository
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="rounded-lg bg-muted p-4">
							<h4 className="font-medium text-sm">What this does:</h4>
							<ul className="mt-2 space-y-1 text-muted-foreground text-sm">
								<li>
									• Fetches conference data from AI Deadlines GitHub repository
								</li>
								<li>• Filters for conferences with future deadlines only</li>
								<li>
									• Creates events with conference details, deadlines, and links
								</li>
								<li>
									• Adds venue information and conference rankings where
									available
								</li>
							</ul>
						</div>

						<Button
							onClick={handleBatchImport}
							disabled={isImporting}
							size="lg"
							className="w-full"
						>
							{isImporting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Importing Conferences...
								</>
							) : (
								<>
									<Calendar className="mr-2 h-4 w-4" />
									Import Conferences
								</>
							)}
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Trash2 className="h-5 w-5 text-destructive" />
						Batch Delete All Events
					</CardTitle>
					<CardDescription>
						Remove all events and associated participations from the system
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
							<h4 className="font-medium text-destructive text-sm">
								⚠️ Warning:
							</h4>
							<ul className="mt-2 space-y-1 text-destructive text-sm">
								<li>• This action will permanently delete ALL events</li>
								<li>• All user participations will also be removed</li>
								<li>• This action cannot be undone</li>
								<li>• Consider backing up data before proceeding</li>
							</ul>
						</div>

						<Button
							onClick={() => setShowDeleteDialog(true)}
							disabled={isDeleting}
							variant="destructive"
							size="lg"
							className="w-full"
						>
							{isDeleting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Deleting All Events...
								</>
							) : (
								<>
									<Trash2 className="mr-2 h-4 w-4" />
									Delete All Events
								</>
							)}
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Data Source</CardTitle>
					<CardDescription>
						Conference data is sourced from the AI Deadlines project
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-2 text-sm">
						<p>
							<strong>Repository:</strong> huggingface/ai-deadlines
						</p>
						<p>
							<strong>URL:</strong>{" "}
							<a
								href="https://raw.githubusercontent.com/huggingface/ai-deadlines/refs/heads/main/src/data/conferences.yml"
								target="_blank"
								rel="noopener noreferrer"
								className="text-primary hover:underline"
							>
								conferences.yml
							</a>
						</p>
						<p>
							<strong>Update Frequency:</strong> Community maintained, updated
							regularly
						</p>
					</div>
				</CardContent>
			</Card>

			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete All Events?</AlertDialogTitle>
						<AlertDialogDescription>
							This action will permanently delete all events and their
							associated participations. This cannot be undone. Are you sure you
							want to continue?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleBatchDelete}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Deleting...
								</>
							) : (
								"Delete All Events"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
