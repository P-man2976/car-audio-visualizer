/**
 * Separator コンポーネントのブラウザテスト。
 * orientation / decorative 属性を検証する。
 */
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test } from "vitest";
import { Separator } from "@/components/ui/separator";

describe("Separator", () => {
	test("デフォルトは horizontal", async () => {
		render(<Separator data-testid="sep" />);
		const sep = page.getByTestId("sep");
		await expect.element(sep).toHaveAttribute("data-orientation", "horizontal");
	});

	test("orientation=vertical が反映される", async () => {
		render(<Separator orientation="vertical" data-testid="sep-v" />);
		const sep = page.getByTestId("sep-v");
		await expect.element(sep).toHaveAttribute("data-orientation", "vertical");
	});

	test("デフォルトは decorative（role=none）", async () => {
		render(<Separator data-testid="sep-dec" />);
		const sep = page.getByTestId("sep-dec");
		await expect.element(sep).toHaveAttribute("role", "none");
	});

	test("decorative=false で role=separator になる", async () => {
		render(<Separator decorative={false} />);
		const sep = page.getByRole("separator");
		await expect.element(sep).toBeInTheDocument();
	});
});
