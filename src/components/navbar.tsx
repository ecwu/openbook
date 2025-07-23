import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { UserDropdown } from "@/components/user-dropdown";
import { auth } from "@/server/auth";
import Link from "next/link";

export async function Navbar() {
	const session = await auth();

	return (
		<nav className="sticky top-0 z-50 w-full border-border/40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
			<div className="container mx-auto flex h-14 max-w-7xl items-center">
				<div className="mr-4 flex">
					<Link href="/" className="mr-6 flex items-center space-x-2">
						<span className="font-bold text-xl">OpenBook</span>
						<Badge variant="secondary" className="ml-2 text-xs">
							Beta
						</Badge>
					</Link>

					<NavigationMenu>
						<NavigationMenuList>
							<NavigationMenuItem>
								<NavigationMenuTrigger>Resources</NavigationMenuTrigger>
								<NavigationMenuContent>
									<div className="grid w-[400px] gap-3 p-4">
										<NavigationMenuLink asChild>
											<Link
												href="/resources"
												className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
											>
												<div className="font-medium text-sm leading-none">
													All Resources
												</div>
												<p className="line-clamp-2 text-muted-foreground text-sm leading-snug">
													View and manage all computing resources
												</p>
											</Link>
										</NavigationMenuLink>
										<NavigationMenuLink asChild>
											<Link
												href="/resources/create"
												className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
											>
												<div className="font-medium text-sm leading-none">
													Add Resource
												</div>
												<p className="line-clamp-2 text-muted-foreground text-sm leading-snug">
													Create new computing resources
												</p>
											</Link>
										</NavigationMenuLink>
									</div>
								</NavigationMenuContent>
							</NavigationMenuItem>
							<NavigationMenuItem>
								<NavigationMenuLink
									href="/bookings"
									className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50"
								>
									Bookings
								</NavigationMenuLink>
							</NavigationMenuItem>
							<NavigationMenuItem>
								<NavigationMenuLink
									href="/groups"
									className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50"
								>
									Groups
								</NavigationMenuLink>
							</NavigationMenuItem>
						</NavigationMenuList>
					</NavigationMenu>
				</div>

				<div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
					<div className="w-full flex-1 md:w-auto md:flex-none"></div>

					<div className="flex items-center gap-2">
						<ThemeToggle />
						{session?.user ? (
							<UserDropdown user={session.user} />
						) : (
							<Button asChild>
								<Link href="/api/auth/signin">Sign In</Link>
							</Button>
						)}
					</div>
				</div>
			</div>
		</nav>
	);
}
