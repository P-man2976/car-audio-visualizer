/**
 * Button コンポーネントのブラウザテスト。
 * vitest-browser-react を使用し、実ブラウザ環境でレンダリング・操作を検証する。
 */
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test, vi } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
	test("テキストを正しくレンダリングする", async () => {
		render(<Button>クリック</Button>);
		await expect
			.element(page.getByRole("button", { name: "クリック" }))
			.toBeInTheDocument();
	});

	test("クリックイベントが発火する", async () => {
		const handleClick = vi.fn();
		render(<Button onClick={handleClick}>送信</Button>);

		await page.getByRole("button", { name: "送信" }).click();
		expect(handleClick).toHaveBeenCalledOnce();
	});

	test("disabled のときクリックできない", async () => {
		const handleClick = vi.fn();
		render(
			<Button disabled onClick={handleClick}>
				無効
			</Button>,
		);

		const button = page.getByRole("button", { name: "無効" });
		await expect.element(button).toBeDisabled();
	});

	test("variant が data-variant 属性に反映される", async () => {
		render(<Button variant="destructive">削除</Button>);
		const button = page.getByRole("button", { name: "削除" });
		await expect.element(button).toHaveAttribute("data-variant", "destructive");
	});

	test("size が data-size 属性に反映される", async () => {
		render(<Button size="sm">小さいボタン</Button>);
		const button = page.getByRole("button", { name: "小さいボタン" });
		await expect.element(button).toHaveAttribute("data-size", "sm");
	});

	test("asChild で子要素をルートとして描画する", async () => {
		render(
			<Button asChild>
				<a href="/test">リンクボタン</a>
			</Button>,
		);
		const link = page.getByRole("link", { name: "リンクボタン" });
		await expect.element(link).toBeInTheDocument();
		await expect.element(link).toHaveAttribute("href", "/test");
	});
});
