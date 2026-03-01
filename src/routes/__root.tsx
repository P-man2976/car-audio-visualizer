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
import { DevTools as JotaiDevTools } from "jotai-devtools";
import type { ReactNode } from "react";
import indexCss from "../index.css?url";
import "jotai-devtools/styles.css";

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
			<JotaiDevTools position="bottom-left" />
			<ReactQueryDevtools
				initialIsOpen={false}
				buttonPosition="bottom-right"
				position="bottom"
			/>
			<TanStackRouterDevtools position="bottom-left" />
		</QueryClientProvider>
	);
}
