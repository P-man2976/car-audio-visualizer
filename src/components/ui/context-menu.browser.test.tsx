/**
 * ContextMenu コンポーネントのブラウザテスト。
 * Radix ContextMenu の Portal は vitest-browser-react のテスト間 cleanup と干渉するため、
 * 全検証を 1 テスト内で sequential に行う。
 */
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test, vi } from "vitest";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";

/**
 * Radix ContextMenu は pointer-down(right-button) で開く。
 * contextmenu イベントをディスパッチして開き、Portal 描画完了を待つ。
 */
async function openContextMenu(element: ReturnType<typeof page.getByText>) {
	const el = element.element();
	el.dispatchEvent(new PointerEvent("contextmenu", { bubbles: true }));
	await new Promise((r) => setTimeout(r, 150));
}

describe("ContextMenu", () => {
	test("右クリックでメニュー表示、onSelect、disabled、Label/Separator、variant を検証", async () => {
		const handleSelect = vi.fn();

		render(
			<ContextMenu>
				<ContextMenuTrigger>右クリック対象</ContextMenuTrigger>
				<ContextMenuContent>
					<ContextMenuLabel>ラベル</ContextMenuLabel>
					<ContextMenuSeparator data-testid="sep" />
					<ContextMenuItem onSelect={handleSelect}>アイテム1</ContextMenuItem>
					<ContextMenuItem>アイテム2</ContextMenuItem>
					<ContextMenuItem disabled>無効アイテム</ContextMenuItem>
					<ContextMenuItem variant="destructive">削除</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>,
		);

		// メニューが閉じている状態
		await expect.element(page.getByText("アイテム1")).not.toBeInTheDocument();

		// 右クリックでメニュー表示
		await openContextMenu(page.getByText("右クリック対象"));

		// items が表示される
		await expect.element(page.getByText("アイテム1")).toBeInTheDocument();
		await expect.element(page.getByText("アイテム2")).toBeInTheDocument();

		// Label と Separator が描画される
		await expect.element(page.getByText("ラベル")).toBeInTheDocument();
		await expect.element(page.getByTestId("sep")).toBeInTheDocument();

		// disabled なアイテムには data-disabled が付く
		await expect
			.element(page.getByText("無効アイテム"))
			.toHaveAttribute("data-disabled");

		// variant=destructive で data-variant が設定される
		await expect
			.element(page.getByText("削除"))
			.toHaveAttribute("data-variant", "destructive");

		// onSelect が呼ばれる
		await page.getByText("アイテム1").click();
		expect(handleSelect).toHaveBeenCalledOnce();
	});
});
