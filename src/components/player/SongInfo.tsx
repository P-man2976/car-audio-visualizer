import { useRef } from "react";
import { cn } from "@/lib/utils";

export function SongInfo({
	title,
	artist,
	album,
	badge,
}: {
	title?: string;
	artist?: string;
	album?: string;
	badge?: string;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const titleRef = useRef<HTMLHeadingElement>(null);
	const albumRef = useRef<HTMLSpanElement>(null);
	const artistRef = useRef<HTMLSpanElement>(null);

	return (
		<div
			ref={containerRef}
			className="flex w-full grow-0 flex-col gap-1 overflow-hidden"
		>
			<div className="flex items-center gap-1.5 overflow-hidden">
				{badge && (
					<span className="shrink-0 rounded border border-neutral-400/40 bg-neutral-500/60 px-1.5 py-0.5 text-xs font-mono font-bold leading-none text-neutral-200">
						{badge}
					</span>
				)}
				<h2
					ref={titleRef}
					className={cn(
						"w-fit whitespace-nowrap text-base sm:text-lg md:text-xl",
						{
							"animate-scroll":
								(titleRef.current?.clientWidth ?? 0) >
								(containerRef.current?.clientWidth ?? 0),
						},
					)}
					style={{ animationDuration: `${title?.length ?? 0}s` }}
				>
					{title}
				</h2>
			</div>
			<span
				ref={albumRef}
				className={cn(
					"hidden w-fit whitespace-nowrap text-xs text-gray-400 sm:block sm:text-sm",
					{
						"animate-scroll":
							(albumRef.current?.clientWidth ?? 0) >
							(containerRef.current?.clientWidth ?? 0),
					},
				)}
				style={{ animationDuration: `${album?.length ?? 0}s` }}
			>
				{album}
			</span>
			<span
				ref={artistRef}
				className={cn(
					"w-fit whitespace-nowrap text-xs text-gray-400 sm:text-sm",
					{
						"animate-scroll":
							(artistRef.current?.clientWidth ?? 0) >
							(containerRef.current?.clientWidth ?? 0),
					},
				)}
			>
				{artist}
			</span>
		</div>
	);
}
