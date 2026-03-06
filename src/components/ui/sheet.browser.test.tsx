/**
 * Sheet コンポーネントのブラウザテスト。
 * 開閉、side prop、showCloseButton、タイトル / 説明の描画を検証する。
 */
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test } from "vitest";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";

describe("Sheet", () => {
	test("トリガーをクリックするとシートが開く", async () => {
		render(
			<Sheet>
				<SheetTrigger>開く</SheetTrigger>
				<SheetContent>
					<SheetHeader>
						<SheetTitle>シートタイトル</SheetTitle>
						<SheetDescription>シート説明</SheetDescription>
					</SheetHeader>
				</SheetContent>
			</Sheet>,
		);

		await page.getByRole("button", { name: "開く" }).click();
		await expect.element(page.getByText("シートタイトル")).toBeInTheDocument();
		await expect.element(page.getByText("シート説明")).toBeInTheDocument();
	});

	test("showCloseButton でクローズボタンが表示される", async () => {
		render(
			<Sheet>
				<SheetTrigger>開く</SheetTrigger>
				<SheetContent showCloseButton>
					<SheetTitle>クローズテスト</SheetTitle>
				</SheetContent>
			</Sheet>,
		);

		await page.getByRole("button", { name: "開く" }).click();
		await expect.element(page.getByText("クローズテスト")).toBeInTheDocument();

		await page.getByRole("button", { name: "Close" }).click();
		await expect
			.element(page.getByText("クローズテスト"))
			.not.toBeInTheDocument();
	});

	test("showCloseButton=false（デフォルト）でクローズボタンが非表示", async () => {
		render(
			<Sheet>
				<SheetTrigger>開く</SheetTrigger>
				<SheetContent>
					<SheetTitle>ボタンなし</SheetTitle>
				</SheetContent>
			</Sheet>,
		);

		await page.getByRole("button", { name: "開く" }).click();
		await expect.element(page.getByText("ボタンなし")).toBeInTheDocument();
		await expect
			.element(page.getByRole("button", { name: "Close" }))
			.not.toBeInTheDocument();
	});

	test("SheetClose で明示的にシートを閉じられる", async () => {
		render(
			<Sheet>
				<SheetTrigger>開く</SheetTrigger>
				<SheetContent>
					<SheetTitle>閉じるテスト</SheetTitle>
					<SheetClose>閉じる</SheetClose>
				</SheetContent>
			</Sheet>,
		);

		await page.getByRole("button", { name: "開く" }).click();
		await expect.element(page.getByText("閉じるテスト")).toBeInTheDocument();

		await page.getByRole("button", { name: "閉じる" }).click();
		await expect
			.element(page.getByText("閉じるテスト"))
			.not.toBeInTheDocument();
	});

	test("open prop で制御モードで動作する", async () => {
		render(
			<Sheet open>
				<SheetContent side="top">
					<SheetTitle>制御モードシート</SheetTitle>
				</SheetContent>
			</Sheet>,
		);

		await expect
			.element(page.getByText("制御モードシート"))
			.toBeInTheDocument();
	});
});
