import { describe, expect, test } from "vitest";
import {
	createPerspParams,
	fillQuadColor,
	perspProject,
	projectedCenterY,
	writePerspQuad,
	writeQuadIndices,
} from "./perspProject";

describe("createPerspParams", () => {
	test("sin/cos が tiltDeg から正しく計算される", () => {
		const p = createPerspParams(0, 0, 50, 30);
		expect(p.sin).toBeCloseTo(0.5);
		expect(p.cos).toBeCloseTo(Math.sqrt(3) / 2);
	});

	test("cx, cy, dist がそのまま格納される", () => {
		const p = createPerspParams(100, 50, 80, 24);
		expect(p.cx).toBe(100);
		expect(p.cy).toBe(50);
		expect(p.dist).toBe(80);
	});

	test("tiltDeg=0 で sin=0, cos=1", () => {
		const p = createPerspParams(0, 0, 50, 0);
		expect(p.sin).toBeCloseTo(0);
		expect(p.cos).toBeCloseTo(1);
	});
});

describe("perspProject", () => {
	test("中心点は自身に射影され s=1", () => {
		const p = createPerspParams(50, 25, 80, 30);
		const r = perspProject(50, 25, p);
		expect(r.px).toBeCloseTo(50);
		expect(r.py).toBeCloseTo(25);
		expect(r.s).toBeCloseTo(1);
	});

	test("中心より上は縮小 (s < 1)", () => {
		const p = createPerspParams(50, 25, 80, 24);
		const r = perspProject(50, 40, p);
		expect(r.s).toBeLessThan(1);
	});

	test("中心より下は拡大 (s > 1)", () => {
		const p = createPerspParams(50, 25, 80, 24);
		const r = perspProject(50, 10, p);
		expect(r.s).toBeGreaterThan(1);
	});

	test("上方の点は X が中心に引き寄せられる", () => {
		const p = createPerspParams(50, 25, 80, 24);
		const r = perspProject(80, 40, p);
		expect(r.px).toBeLessThan(80);
		expect(r.px).toBeGreaterThan(50);
	});

	test("下方の点は X が中心から押し出される", () => {
		const p = createPerspParams(50, 25, 80, 24);
		const r = perspProject(80, 10, p);
		expect(r.px).toBeGreaterThan(80);
	});

	test("tiltDeg=0 は歪みなし", () => {
		const p = createPerspParams(50, 25, 80, 0);
		const r = perspProject(30, 40, p);
		expect(r.px).toBeCloseTo(30);
		expect(r.py).toBeCloseTo(40);
		expect(r.s).toBeCloseTo(1);
	});

	test("Y の cos 圧縮が適用される", () => {
		const p = createPerspParams(0, 0, 100, 30);
		const r = perspProject(0, 20, p);
		// cos(30°) ≈ 0.866 → py < 20
		expect(r.py).toBeLessThan(20);
		expect(r.py).toBeGreaterThan(0);
	});

	test("対称性: 中心から左右等距離の点は等距離に射影される", () => {
		const p = createPerspParams(50, 25, 80, 24);
		const left = perspProject(30, 40, p);
		const right = perspProject(70, 40, p);
		expect(50 - left.px).toBeCloseTo(right.px - 50, 10);
		expect(left.py).toBeCloseTo(right.py);
		expect(left.s).toBeCloseTo(right.s);
	});
});

describe("writePerspQuad", () => {
	test("4 頂点を射影して positions 配列に書き込む", () => {
		const p = createPerspParams(10, 10, 100, 0);
		const positions = new Float32Array(12);
		writePerspQuad(positions, 0, 10, 10, 3, 1, p);
		// tiltDeg=0 → 歪みなし、そのまま
		expect(positions[0]).toBeCloseTo(7); // bl x = 10-3
		expect(positions[1]).toBeCloseTo(9); // bl y = 10-1
		expect(positions[3]).toBeCloseTo(13); // br x = 10+3
		expect(positions[6]).toBeCloseTo(13); // tr x
		expect(positions[7]).toBeCloseTo(11); // tr y = 10+1
		expect(positions[9]).toBeCloseTo(7); // tl x
	});

	test("tiltDeg>0 で上辺が下辺より狭くなる", () => {
		const p = createPerspParams(10, 10, 50, 24);
		const positions = new Float32Array(12);
		writePerspQuad(positions, 0, 10, 15, 3, 1, p);
		const blX = positions[0];
		const brX = positions[3];
		const tlX = positions[9];
		const trX = positions[6];
		const bottomWidth = brX - blX;
		const topWidth = trX - tlX;
		expect(topWidth).toBeLessThan(bottomWidth);
	});
});

describe("writeQuadIndices", () => {
	test("2 三角形のインデックスを正しく書き込む", () => {
		const indices = new Uint16Array(6);
		writeQuadIndices(indices, 0);
		expect(Array.from(indices)).toEqual([0, 1, 2, 0, 2, 3]);
	});

	test("cellIdx=2 のオフセットが正しい", () => {
		const indices = new Uint16Array(18);
		writeQuadIndices(indices, 2);
		expect(Array.from(indices.slice(12, 18))).toEqual([8, 9, 10, 8, 10, 11]);
	});
});

describe("fillQuadColor", () => {
	test("4 頂点に同一色を設定する", () => {
		const colors = new Float32Array(12);
		fillQuadColor(colors, 0, 0.5, 0.3, 0.1);
		for (let v = 0; v < 4; v++) {
			expect(colors[v * 3]).toBeCloseTo(0.5);
			expect(colors[v * 3 + 1]).toBeCloseTo(0.3);
			expect(colors[v * 3 + 2]).toBeCloseTo(0.1);
		}
	});
});

describe("projectedCenterY", () => {
	test("tiltDeg=0 では元の中心と一致", () => {
		const p = createPerspParams(50, 25, 80, 0);
		const cy = projectedCenterY(0, 50, p);
		expect(cy).toBeCloseTo(25);
	});

	test("tiltDeg>0 では中心が下方にシフトする", () => {
		const p = createPerspParams(50, 25, 80, 24);
		const cy = projectedCenterY(0, 50, p);
		// 下方（近い）は拡大、上方（遠い）は縮小 → 中心が下方にずれる
		expect(cy).toBeLessThan(25);
	});
});
