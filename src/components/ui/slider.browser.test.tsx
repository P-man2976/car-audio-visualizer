/**
 * Slider コンポーネントのブラウザテスト。
 * 初期値の表示、aria 属性、disabled 状態を検証する。
 */
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test, vi } from "vitest";
import { Slider } from "@/components/ui/slider";

describe("Slider", () => {
	test("slider ロールで描画される", async () => {
		render(<Slider defaultValue={[50]} />);
		const slider = page.getByRole("slider");
		await expect.element(slider).toBeInTheDocument();
	});

	test("defaultValue が aria-valuenow に反映される", async () => {
		render(<Slider defaultValue={[30]} min={0} max={100} />);
		const slider = page.getByRole("slider");
		await expect.element(slider).toHaveAttribute("aria-valuenow", "30");
	});

	test("min / max が aria 属性に反映される", async () => {
		render(<Slider defaultValue={[5]} min={0} max={10} />);
		const slider = page.getByRole("slider");
		await expect.element(slider).toHaveAttribute("aria-valuemin", "0");
		await expect.element(slider).toHaveAttribute("aria-valuemax", "10");
	});

	test("disabled で data-disabled 属性が付与される", async () => {
		render(<Slider defaultValue={[50]} disabled />);
		const slider = page.getByRole("slider");
		await expect.element(slider).toHaveAttribute("data-disabled", "");
	});

	test("onValueChange が呼ばれる（キーボード操作）", async () => {
		const handleChange = vi.fn();
		render(
			<Slider
				defaultValue={[50]}
				min={0}
				max={100}
				step={1}
				onValueChange={handleChange}
			/>,
		);

		// Slider thumb は opacity-0 のため直接クリック不可。Tab で focus してから操作する
		await userEvent.keyboard("{Tab}");
		await userEvent.keyboard("{ArrowRight}");
		expect(handleChange).toHaveBeenCalled();
	});

	test("data-slot=slider がルート要素に設定される", async () => {
		render(<Slider defaultValue={[50]} data-testid="slider-root" />);
		const root = page.getByTestId("slider-root");
		await expect.element(root).toHaveAttribute("data-slot", "slider");
	});
});
