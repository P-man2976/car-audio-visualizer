import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMediaStream } from "@/hooks/mediastream";
import { getInputDeviceLabel, getUserMediaConstraints } from "@/lib/aux-media";

export function ExternalInput() {
	const { connect } = useMediaStream();

	const { data: devices } = useQuery({
		queryKey: ["source", "aux", "external"],
		queryFn: async () => {
			const list = await navigator.mediaDevices.enumerateDevices();
			return list.filter((device) => device.kind === "audioinput");
		},
	});

	return (
		<div className="grid w-full gap-2">
			<Badge variant="secondary">マイク入力</Badge>
			<div className="grid gap-2 sm:grid-cols-2">
				{devices?.map((device, index) => (
					<Button
						key={device.deviceId}
						variant="secondary"
						onClick={async () => {
							const stream = await navigator.mediaDevices.getUserMedia(
								getUserMediaConstraints(device.deviceId),
							);
							connect(stream);
						}}
					>
						{getInputDeviceLabel(device, index)}
					</Button>
				))}
			</div>
		</div>
	);
}
