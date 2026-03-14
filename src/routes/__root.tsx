/// <reference types="vite/client" />

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { DevTools as JotaiDevTools } from "jotai-devtools";
import jotaiDevtoolsCss from "jotai-devtools/styles.css?inline";
import type { ReactNode } from "react";
import { FileRestore } from "@/components/FileRestore";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import indexCss from "../index.css?url";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
		},
	},
});

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content:
					"width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no",
			},
			{ title: "car-audio-visualizer" },
			{ name: "theme-color", content: "#4b556380" },
			{
				name: "apple-mobile-web-app-capable",
				content: "yes",
			},
			{
				name: "apple-mobile-web-app-status-bar-style",
				content: "black-translucent",
			},
		],
		links: [
			{
				rel: "icon",
				type: "image/png",
				sizes: "192x192",
				href: "/icon-192.png",
			},
			{ rel: "apple-touch-icon", href: "/icon-192.png" },
			{ rel: "manifest", href: "/manifest.webmanifest" },
			{ rel: "stylesheet", href: indexCss },
		],
	}),
	component: RootComponent,
	notFoundComponent: () => <p>ページが見つかりません</p>,
	shellComponent: RootDocument,
});

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="ja" className="dark">
			<head>
				<HeadContent />
			</head>
			<body>
				<div id="root">{children}</div>
				<Scripts />
			</body>
		</html>
	);
}

function RootComponent() {
	return (
		<QueryClientProvider client={queryClient}>
			<TooltipProvider>
				<Outlet />
				<FileRestore />
				<Toaster />
			</TooltipProvider>
			{import.meta.env.DEV && (
				<>
					<style>{jotaiDevtoolsCss}</style>
					<JotaiDevTools position="bottom-left" />
				</>
			)}
			<ReactQueryDevtools
				initialIsOpen={false}
				buttonPosition="bottom-right"
				position="bottom"
			/>
			<TanStackRouterDevtools position="bottom-left" />
		</QueryClientProvider>
	);
}
