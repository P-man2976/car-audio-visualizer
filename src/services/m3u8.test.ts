import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAndParseM3u8 } from "./m3u8";

const originalFetch = globalThis.fetch;

afterEach(() => {
	if (originalFetch) {
		globalThis.fetch = originalFetch;
	} else {
		Reflect.deleteProperty(globalThis, "fetch");
	}
	vi.restoreAllMocks();
});

describe("fetchAndParseM3u8", () => {
	it("parses segment count and metadata", async () => {
		const m3u8 = [
			"#EXTM3U",
			"#EXT-X-TARGETDURATION:6",
			"#EXTINF:6.0,",
			"segment-1.ts",
			"#EXTINF:6.0,",
			"segment-2.ts",
			"#EXT-X-ENDLIST",
		].join("\n");

		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => m3u8,
		});

		globalThis.fetch = fetchMock as typeof fetch;

		const result = await fetchAndParseM3u8("/demo.m3u8");
		expect(result.segmentCount).toBe(2);
		expect(result.targetDuration).toBe(6);
		expect(result.isLive).toBe(false);
	});

	it("throws when response is not ok", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: false,
			status: 404,
			text: async () => "",
		});

		globalThis.fetch = fetchMock as typeof fetch;

		await expect(fetchAndParseM3u8("/missing.m3u8")).rejects.toThrow(
			"m3u8 fetch failed: 404",
		);
	});
});
