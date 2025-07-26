import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Server, Settings, Shield, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface AdminLayoutProps {
	children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
	return (
		<div className="min-h-screen bg-background">
			{/* Admin Header */}
			<div className="border-b bg-card">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Shield className="h-6 w-6 text-primary" />
							<div>
								<h1 className="font-semibold text-xl">Admin Panel</h1>
								<p className="text-muted-foreground text-sm">
									System administration and management
								</p>
							</div>
						</div>
						<Badge variant="secondary">
							<Shield className="mr-1 h-3 w-3" />
							Administrator
						</Badge>
					</div>
				</div>
			</div>

			{/* Admin Navigation */}
			<div className="border-b">
				<div className="container mx-auto px-4">
					<nav className="flex gap-1 py-2">
						<Button asChild variant="ghost" className="justify-start">
							<Link href="/admin/resources" className="flex items-center gap-2">
								<Server className="h-4 w-4" />
								Resources
							</Link>
						</Button>
						<Button asChild variant="ghost" className="justify-start">
							<Link href="/admin/groups" className="flex items-center gap-2">
								<Users className="h-4 w-4" />
								Groups
							</Link>
						</Button>
						<Button asChild variant="ghost" className="justify-start">
							<Link href="/admin/users" className="flex items-center gap-2">
								<Users className="h-4 w-4" />
								Users
							</Link>
						</Button>
						<Button asChild variant="ghost" className="justify-start">
							<Link href="/admin/limits" className="flex items-center gap-2">
								<Settings className="h-4 w-4" />
								Limits
							</Link>
						</Button>
					</nav>
				</div>
			</div>

			{/* Admin Content */}
			<main className="flex-1">{children}</main>
		</div>
	);
}
