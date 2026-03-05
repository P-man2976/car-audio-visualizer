import { describe, expect, test } from "vitest";
import { createPerspParams, perspProject } from "./perspProject";

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
