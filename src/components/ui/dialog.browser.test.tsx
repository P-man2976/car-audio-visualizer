/**
 * Dialog コンポーネントのブラウザテスト。
 * 開閉、showCloseButton、タイトル / 説明 / フッターの描画を検証する。
 */
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test } from "vitest";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

describe("Dialog", () => {
	test("トリガーをクリックするとダイアログが開く", async () => {
		render(
			<Dialog>
				<DialogTrigger>開く</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>タイトル</DialogTitle>
						<DialogDescription>説明文</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>,
		);

		await page.getByRole("button", { name: "開く" }).click();
		await expect.element(page.getByText("タイトル")).toBeInTheDocument();
		await expect.element(page.getByText("説明文")).toBeInTheDocument();
	});

	test("Close ボタンでダイアログが閉じる", async () => {
		render(
			<Dialog>
				<DialogTrigger>開く</DialogTrigger>
				<DialogContent showCloseButton>
					<DialogTitle>閉じるテスト</DialogTitle>
				</DialogContent>
			</Dialog>,
		);

		await page.getByRole("button", { name: "開く" }).click();
		await expect.element(page.getByText("閉じるテスト")).toBeInTheDocument();

		await page.getByRole("button", { name: "Close" }).click();
		await expect
			.element(page.getByText("閉じるテスト"))
			.not.toBeInTheDocument();
	});

	test("showCloseButton=false で Close ボタンが表示されない", async () => {
		render(
			<Dialog>
				<DialogTrigger>開く</DialogTrigger>
				<DialogContent showCloseButton={false}>
					<DialogTitle>ボタンなし</DialogTitle>
				</DialogContent>
			</Dialog>,
		);

		await page.getByRole("button", { name: "開く" }).click();
		await expect.element(page.getByText("ボタンなし")).toBeInTheDocument();
		await expect
			.element(page.getByRole("button", { name: "Close" }))
			.not.toBeInTheDocument();
	});

	test("DialogFooter の showCloseButton で Close ボタンを追加できる", async () => {
		render(
			<Dialog>
				<DialogTrigger>開く</DialogTrigger>
				<DialogContent showCloseButton={false}>
					<DialogTitle>フッターテスト</DialogTitle>
					<DialogFooter showCloseButton>
						<button type="button">カスタム</button>
					</DialogFooter>
				</DialogContent>
			</Dialog>,
		);

		await page.getByRole("button", { name: "開く" }).click();
		await expect
			.element(page.getByRole("button", { name: "Close" }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole("button", { name: "カスタム" }))
			.toBeInTheDocument();
	});

	test("open prop で制御モードで動作する", async () => {
		render(
			<Dialog open>
				<DialogContent>
					<DialogTitle>制御モード</DialogTitle>
				</DialogContent>
			</Dialog>,
		);

		await expect.element(page.getByText("制御モード")).toBeInTheDocument();
	});
});
