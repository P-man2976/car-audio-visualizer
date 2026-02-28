import { cn } from "@/lib/utils";
import { useRef } from "react";

export function SongInfo({
	title,
	artist,
	album,
}: {
	title?: string;
	artist?: string;
	album?: string;
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
			<h2
				ref={titleRef}
				className={cn("w-fit whitespace-nowrap text-xl", {
					"animate-scroll":
						(titleRef.current?.clientWidth ?? 0) >
						(containerRef.current?.clientWidth ?? 0),
				})}
				style={{ animationDuration: `${title?.length ?? 0}s` }}
			>
				{title}
			</h2>
			<span
				ref={albumRef}
				className={cn("w-fit whitespace-nowrap text-sm text-gray-400", {
					"animate-scroll":
						(albumRef.current?.clientWidth ?? 0) >
						(containerRef.current?.clientWidth ?? 0),
				})}
				style={{ animationDuration: `${album?.length ?? 0}s` }}
			>
				{album}
			</span>
			<span
				ref={artistRef}
				className={cn("w-fit whitespace-nowrap text-sm text-gray-400", {
					"animate-scroll":
						(artistRef.current?.clientWidth ?? 0) >
						(containerRef.current?.clientWidth ?? 0),
				})}
			>
				{artist}
			</span>
		</div>
	);
}
