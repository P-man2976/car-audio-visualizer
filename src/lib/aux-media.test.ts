import { describe, expect, it } from "vitest";
import { getDisplayMediaConstraints, getInputDeviceLabel, getUserMediaConstraints } from "./aux-media";

describe("aux media helpers", () => {
	it("creates display media constraints with audio tuning", () => {
		const constraints = getDisplayMediaConstraints();
		expect(constraints.video).toEqual({ displaySurface: "monitor" });
		expect(constraints.audio).toEqual({
			echoCancellation: false,
			noiseSuppression: false,
			autoGainControl: false,
		});
	});

	it("creates user media constraints with selected device", () => {
		const constraints = getUserMediaConstraints("mic-1");
		expect(constraints.audio).toEqual({
			deviceId: { exact: "mic-1" },
			echoCancellation: false,
			noiseSuppression: false,
			autoGainControl: false,
		});
		expect(constraints.video).toBe(false);
	});

	it("falls back to generated device label when empty", () => {
		const label = getInputDeviceLabel({ label: "" } as MediaDeviceInfo, 2);
		expect(label).toBe("Audio Input 3");
	});
});