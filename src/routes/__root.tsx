/// <reference types="vite/client" />

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRoute,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { ReactNode } from "react";
import indexCss from "../index.css?url";

const queryClient = new QueryClient();

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "car-audio-visualizer" },
		],
		links: [
			{ rel: "icon", type: "image/svg+xml", href: "/vite.svg" },
			{ rel: "stylesheet", href: indexCss },
		],
	}),
	component: RootComponent,
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
			<Outlet />
			<ReactQueryDevtools
				initialIsOpen={false}
				buttonPosition="bottom-right"
				position="bottom"
			/>
			<TanStackRouterDevtools position="bottom-left" />
		</QueryClientProvider>
	);
}
