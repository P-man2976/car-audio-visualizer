export function getDisplayMediaConstraints(): DisplayMediaStreamOptions {
	return {
		audio: {
			echoCancellation: false,
			noiseSuppression: false,
			autoGainControl: false,
		},
		video: {
			displaySurface: "monitor",
		},
	};
}

export function getUserMediaConstraints(
	deviceId: string,
): MediaStreamConstraints {
	return {
		audio: {
			deviceId: { exact: deviceId },
			echoCancellation: false,
			noiseSuppression: false,
			autoGainControl: false,
		},
		video: false,
	};
}

export function getInputDeviceLabel(
	device: MediaDeviceInfo,
	index: number,
): string {
	return device.label || `Audio Input ${index + 1}`;
}
