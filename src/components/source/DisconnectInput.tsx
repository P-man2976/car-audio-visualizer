import { Button } from "@/components/ui/button";
import { useSetAtom } from "jotai";
import { currentSrcAtom } from "../../atoms/player";
import { useMediaStream } from "../../hooks/mediastream";

export function DisconnectInput() {
	const { disconnect } = useMediaStream();
	const setCurrentSrc = useSetAtom(currentSrcAtom);

	return (
		<Button
			className="w-full border border-destructive text-destructive"
			variant="secondary"
			onClick={() => {
				disconnect();
				setCurrentSrc("off");
			}}
		>
			接続解除
		</Button>
	);
}