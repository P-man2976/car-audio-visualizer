/**
 * Tabs コンポーネントのブラウザテスト。
 * タブ切り替え、variant、orientation、コンテンツの表示/非表示を検証する。
 */
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function SampleTabs({
	defaultValue = "a",
	variant,
	orientation,
}: {
	defaultValue?: string;
	variant?: "default" | "line";
	orientation?: "horizontal" | "vertical";
}) {
	return (
		<Tabs defaultValue={defaultValue} orientation={orientation}>
			<TabsList variant={variant}>
				<TabsTrigger value="a">タブA</TabsTrigger>
				<TabsTrigger value="b">タブB</TabsTrigger>
				<TabsTrigger value="c" disabled>
					タブC
				</TabsTrigger>
			</TabsList>
			<TabsContent value="a">コンテンツA</TabsContent>
			<TabsContent value="b">コンテンツB</TabsContent>
			<TabsContent value="c">コンテンツC</TabsContent>
		</Tabs>
	);
}

describe("Tabs", () => {
	test("defaultValue に一致するタブが active になる", async () => {
		render(<SampleTabs defaultValue="a" />);
		const tabA = page.getByRole("tab", { name: "タブA" });
		await expect.element(tabA).toHaveAttribute("data-state", "active");
		await expect.element(page.getByText("コンテンツA")).toBeInTheDocument();
	});

	test("タブをクリックするとコンテンツが切り替わる", async () => {
		render(<SampleTabs />);

		await page.getByRole("tab", { name: "タブB" }).click();

		await expect
			.element(page.getByRole("tab", { name: "タブB" }))
			.toHaveAttribute("data-state", "active");
		await expect.element(page.getByText("コンテンツB")).toBeInTheDocument();
	});

	test("disabled のタブはクリックできない", async () => {
		render(<SampleTabs />);
		const tabC = page.getByRole("tab", { name: "タブC" });
		await expect.element(tabC).toBeDisabled();
	});

	test("orientation=vertical が data-orientation に反映される", async () => {
		render(<SampleTabs orientation="vertical" />);
		const tabgroup = page.getByRole("tablist");
		await expect
			.element(tabgroup)
			.toHaveAttribute("aria-orientation", "vertical");
	});

	test("variant=line が TabsList の data-variant に反映される", async () => {
		render(<SampleTabs variant="line" />);
		const tablist = page.getByRole("tablist");
		await expect.element(tablist).toHaveAttribute("data-variant", "line");
	});
});
