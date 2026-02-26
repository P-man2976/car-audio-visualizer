import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAtom, useAtomValue } from "jotai";
import { currentRadioAtom, radioStationSizeAtom } from "../../atoms/radio";
import { currentSrcAtom, queueAtom } from "../../atoms/player";
import type { RadikoStation } from "../../types/radio";

export function RadioStation({ name, id, logo }: RadikoStation) {
	const [currentRadio, setCurrentRadio] = useAtom(currentRadioAtom);
	const [currentSrc, setCurrentSrc] = useAtom(currentSrcAtom);
	const size = useAtomValue(radioStationSizeAtom);
	const [queue, setQueue] = useAtom(queueAtom);

	const isSelected = currentSrc === "radio" && currentRadio?.source === "radiko" && currentRadio.id === id;

	return (
		<Button
			variant="ghost"
			className={cn(
				"flex justify-start h-full gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-500/50 transition-all group",
				isSelected && "bg-gray-500/30 border"
			)}
			onClick={() => {
				setCurrentSrc("radio");
				setCurrentRadio({ type: "FM", source: "radiko", id, name, logo: logo?.[0] });
				if (!queue.includes(name)) {
					setQueue((current) => [name, ...current].slice(0, 20));
				}
			}}
		>
			<div
				className={cn(
					"h-full grid place-content-center p-2 rounded-md shadow-md transition-all",
					size === "lg" && "w-24",
					isSelected
						? "bg-gray-300"
						: "bg-gray-500/50 group-hover:bg-gray-400/50"
				)}
			>
				{logo?.[0] ? (
					<img src={logo[0]} alt={name} />
				) : (
					<span>{name.slice(0, 2)}</span>
				)}
			</div>
			{size === "lg" ? <span className="text-lg">{name}</span> : null}
		</Button>
	);
}
