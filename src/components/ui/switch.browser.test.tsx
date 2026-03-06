/**
 * Switch コンポーネントのブラウザテスト。
 * トグル操作、size prop、disabled 状態を検証する。
 */
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test, vi } from "vitest";
import { Switch } from "@/components/ui/switch";

describe("Switch", () => {
	test("初期状態は OFF (data-state=unchecked)", async () => {
		render(<Switch aria-label="通知" />);
		const sw = page.getByRole("switch", { name: "通知" });
		await expect.element(sw).toHaveAttribute("data-state", "unchecked");
	});

	test("クリックで ON/OFF がトグルする", async () => {
		render(<Switch aria-label="通知" />);
		const sw = page.getByRole("switch", { name: "通知" });

		await sw.click();
		await expect.element(sw).toHaveAttribute("data-state", "checked");

		await sw.click();
		await expect.element(sw).toHaveAttribute("data-state", "unchecked");
	});

	test("onCheckedChange コールバックが呼ばれる", async () => {
		const handleChange = vi.fn();
		render(<Switch aria-label="設定" onCheckedChange={handleChange} />);

		await page.getByRole("switch", { name: "設定" }).click();
		expect(handleChange).toHaveBeenCalledWith(true);
	});

	test("disabled のときトグルできない", async () => {
		render(<Switch aria-label="無効" disabled />);
		const sw = page.getByRole("switch", { name: "無効" });
		await expect.element(sw).toBeDisabled();
	});

	test("size=sm が data-size 属性に反映される", async () => {
		render(<Switch aria-label="小" size="sm" />);
		const sw = page.getByRole("switch", { name: "小" });
		await expect.element(sw).toHaveAttribute("data-size", "sm");
	});

	test("デフォルト size は default", async () => {
		render(<Switch aria-label="標準" />);
		const sw = page.getByRole("switch", { name: "標準" });
		await expect.element(sw).toHaveAttribute("data-size", "default");
	});

	test("defaultChecked で初期 ON にできる", async () => {
		render(<Switch aria-label="初期ON" defaultChecked />);
		const sw = page.getByRole("switch", { name: "初期ON" });
		await expect.element(sw).toHaveAttribute("data-state", "checked");
	});
});
