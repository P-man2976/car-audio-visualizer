import { Button } from "@/components/ui/button";
import { useMediaStream } from "@/hooks/mediastream";
import { getDisplayMediaConstraints } from "@/lib/aux-media";

export function ScreenShare() {
	const { connect } = useMediaStream();

	return (
		<Button
			className="w-full"
			onClick={async () => {
				const stream = await navigator.mediaDevices.getDisplayMedia(
					getDisplayMediaConstraints(),
				);
				connect(stream);
			}}
		>
			PC上の音声を共有
		</Button>
	);
}
