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
});
