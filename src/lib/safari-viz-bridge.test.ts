import { describe, expect, it, vi } from "vitest";
import { isMECSNBroken, readBoxType } from "./safari-viz-bridge";

// readBoxType は内部関数だが、テストのためにエクスポートする
// (テスト対象外の場合はスキップ可)

describe("isMECSNBroken", () => {
	it("Safari の UA で true を返す", () => {
		Object.defineProperty(navigator, "userAgent", {
			value:
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15",
			configurable: true,
		});
		expect(isMECSNBroken()).toBe(true);
	});

	it("Chrome の UA で false を返す", () => {
		Object.defineProperty(navigator, "userAgent", {
			value:
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
			configurable: true,
		});
		expect(isMECSNBroken()).toBe(false);
	});

	it("Firefox の UA で false を返す", () => {
		Object.defineProperty(navigator, "userAgent", {
			value:
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0",
			configurable: true,
		});
		expect(isMECSNBroken()).toBe(false);
	});
});

describe("readBoxType", () => {
	it("ftyp ボックスを正しく読み取る", () => {
		// MP4 box: [size(4 bytes)][type(4 bytes)]
		const data = new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70]); // "ftyp"
		expect(readBoxType(data)).toBe("ftyp");
	});

	it("moof ボックスを正しく読み取る", () => {
		const data = new Uint8Array([0, 0, 0, 16, 0x6d, 0x6f, 0x6f, 0x66]); // "moof"
		expect(readBoxType(data)).toBe("moof");
	});

	it("8 バイト未満のデータで空文字を返す", () => {
		const data = new Uint8Array([0, 0, 0]);
		expect(readBoxType(data)).toBe("");
	});

	it("空の Uint8Array で空文字を返す", () => {
		const data = new Uint8Array(0);
		expect(readBoxType(data)).toBe("");
	});
});
