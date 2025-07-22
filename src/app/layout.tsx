import "@/styles/globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/sonner";
import { TRPCReactProvider } from "@/trpc/react";

export const metadata: Metadata = {
	title: "OpenBook - Resource Management",
	description: "Resource booking and management system",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className={`${geist.variable}`}>
			<body>
				<TRPCReactProvider>
					<Navbar />
					{children}
					<Toaster />
				</TRPCReactProvider>
			</body>
		</html>
	);
}
