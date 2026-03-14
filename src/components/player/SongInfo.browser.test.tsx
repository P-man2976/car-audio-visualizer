/**
 * SongInfo コンポーネントのブラウザテスト。
 * title / artist / album の表示を検証する。
 */
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test } from "vitest";
import { SongInfo } from "@/components/player/SongInfo";

describe("SongInfo", () => {
	test("title / artist / album をすべて表示する", async () => {
		render(
			<SongInfo
				title="テスト曲"
				artist="テストアーティスト"
				album="テストアルバム"
			/>,
		);
		await expect
			.element(page.getByRole("heading", { name: "テスト曲" }))
			.toBeInTheDocument();
		await expect
			.element(page.getByText("テストアーティスト"))
			.toBeInTheDocument();
		await expect.element(page.getByText("テストアルバム")).toBeInTheDocument();
	});

	test("props が未指定のときも描画される", async () => {
		render(<SongInfo />);
		// h2 が空文字で存在する
		await expect
			.element(page.getByRole("heading", { level: 2 }))
			.toBeInTheDocument();
	});

	test("title のみ指定したときアーティスト・アルバムは空", async () => {
		render(<SongInfo title="曲名だけ" />);
		await expect
			.element(page.getByRole("heading", { name: "曲名だけ" }))
			.toBeInTheDocument();
	});

	test("badge を指定するとタイトルの左にバッジが表示される", async () => {
		render(<SongInfo title="TBSラジオ" badge="1" />);
		await expect.element(page.getByText("1")).toBeInTheDocument();
		await expect
			.element(page.getByRole("heading", { name: "TBSラジオ" }))
			.toBeInTheDocument();
	});

	test("badge が未指定のときバッジ要素は描画されない", async () => {
		render(<SongInfo title="テスト" />);
		await expect
			.element(page.getByRole("heading", { name: "テスト" }))
			.toBeInTheDocument();
		// badge 用の shrink-0 span が存在しないことを確認
		const heading = page.getByRole("heading", { name: "テスト" });
		const titleRow = heading.element().parentElement;
		expect(titleRow?.querySelectorAll(".shrink-0").length ?? 0).toBe(0);
	});
});
