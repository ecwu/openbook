import { UserManagementPanel } from "./_components/user-management-panel";

export default function UsersPage() {
	return (
		<div className="container mx-auto px-4 py-6">
			<div className="space-y-6">
				<div>
					<h1 className="font-semibold text-2xl">User Management</h1>
					<p className="text-muted-foreground">
						Manage user accounts, roles, and permissions
					</p>
				</div>
				<UserManagementPanel />
			</div>
		</div>
	);
}
