/**
 * Badge コンポーネントのブラウザテスト。
 * variant / asChild / data 属性を検証する。
 */
import { page } from "vite-plus/test/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test } from "vite-plus/test";
import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  test("テキストを正しくレンダリングする", async () => {
    void render(<Badge>ラベル</Badge>);
    await expect.element(page.getByText("ラベル")).toBeInTheDocument();
  });

  test("デフォルト variant は default", async () => {
    void render(<Badge>初期</Badge>);
    await expect.element(page.getByText("初期")).toHaveAttribute("data-variant", "default");
  });

  test.each([
    "secondary",
    "destructive",
    "outline",
    "ghost",
    "link",
    "success",
    "warning",
  ] as const)("variant=%s が data-variant に反映される", async (variant) => {
    void render(<Badge variant={variant}>{variant}</Badge>);
    await expect.element(page.getByText(variant)).toHaveAttribute("data-variant", variant);
  });

  test("asChild で子要素をルートとして描画する", async () => {
    void render(
      <Badge asChild>
        <a href="/link">リンクバッジ</a>
      </Badge>,
    );
    const link = page.getByRole("link", { name: "リンクバッジ" });
    await expect.element(link).toBeInTheDocument();
    await expect.element(link).toHaveAttribute("href", "/link");
    await expect.element(link).toHaveAttribute("data-slot", "badge");
  });

  test("data-slot=badge 属性が設定される", async () => {
    void render(<Badge>スロット</Badge>);
    await expect.element(page.getByText("スロット")).toHaveAttribute("data-slot", "badge");
  });
});
