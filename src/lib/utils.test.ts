/**
 * utils.ts — cn() のテスト
 */
import { describe, expect, test } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
	test("単一クラスをそのまま返す", () => {
		expect(cn("text-red-500")).toBe("text-red-500");
	});

	test("複数クラスを結合する", () => {
		expect(cn("p-4", "m-2")).toBe("p-4 m-2");
	});

	test("conflicting Tailwind クラスは後者が優先される", () => {
		// twMerge により p-4 が p-2 に上書きされる
		expect(cn("p-4", "p-2")).toBe("p-2");
	});

	test("falsy 値は無視される", () => {
		const cond = false as boolean;
		expect(cn("flex", cond && "hidden", null, undefined, "gap-2")).toBe(
			"flex gap-2",
		);
	});

	test("条件付きクラスオブジェクトをサポートする", () => {
		expect(cn("base", { active: true, disabled: false })).toBe("base active");
	});

	test("引数なしで空文字を返す", () => {
		expect(cn()).toBe("");
	});
});
