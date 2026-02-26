import { Button } from "@/components/ui/button";
import { useMediaStream } from "../../hooks/mediastream";

export function DisconnectInput() {
	const { disconnect } = useMediaStream();

	return (
		<Button className="w-full border border-destructive text-destructive" variant="secondary" onClick={disconnect}>
			接続解除
		</Button>
	);
}