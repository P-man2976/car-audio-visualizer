/**
 * Checkbox コンポーネントのブラウザテスト。
 * チェック操作、disabled 状態、data-state 属性の切り替えを検証する。
 */
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test, vi } from "vitest";
import { Checkbox } from "@/components/ui/checkbox";

describe("Checkbox", () => {
	test("初期状態は未チェック (data-state=unchecked)", async () => {
		render(<Checkbox aria-label="同意" />);
		const checkbox = page.getByRole("checkbox", { name: "同意" });
		await expect.element(checkbox).toHaveAttribute("data-state", "unchecked");
	});

	test("クリックでチェック状態がトグルする", async () => {
		render(<Checkbox aria-label="同意" />);
		const checkbox = page.getByRole("checkbox", { name: "同意" });

		await checkbox.click();
		await expect.element(checkbox).toHaveAttribute("data-state", "checked");

		await checkbox.click();
		await expect.element(checkbox).toHaveAttribute("data-state", "unchecked");
	});

	test("onCheckedChange コールバックが呼ばれる", async () => {
		const handleChange = vi.fn();
		render(<Checkbox aria-label="通知" onCheckedChange={handleChange} />);

		await page.getByRole("checkbox", { name: "通知" }).click();
		expect(handleChange).toHaveBeenCalledWith(true);
	});

	test("disabled のときクリックできない", async () => {
		render(<Checkbox aria-label="無効" disabled />);
		const checkbox = page.getByRole("checkbox", { name: "無効" });
		await expect.element(checkbox).toBeDisabled();
	});

	test("defaultChecked で初期チェック状態にできる", async () => {
		render(<Checkbox aria-label="既チェック" defaultChecked />);
		const checkbox = page.getByRole("checkbox", { name: "既チェック" });
		await expect.element(checkbox).toHaveAttribute("data-state", "checked");
	});
});
