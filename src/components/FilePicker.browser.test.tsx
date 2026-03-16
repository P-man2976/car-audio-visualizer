/**
 * FilePicker コンポーネントのブラウザテスト。
 * showOpenFilePicker が使えるブラウザ環境（Chromium）で
 * ボタン表示と基本的なレンダリングを検証する。
 */
import { createStore, Provider } from "jotai";
import { page } from "vite-plus/test/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test, vi } from "vite-plus/test";

// --- Mock @/atoms/audio (module-scope AudioContext) ---
vi.mock("@/atoms/audio", async () => {
  const { atom } = await import("jotai");
  return {
    audioElementAtom: atom({
      canPlayType: (mimeType: string) => (mimeType.includes("audio") ? "maybe" : ""),
    } as unknown as HTMLAudioElement),
    mediaStreamAtom: atom<MediaStream | null>(null),
    audioMotionAnalyzerAtom: atom(null),
  };
});

import { FilePicker } from "@/components/FilePicker";

async function renderPicker(overrides?: (store: ReturnType<typeof createStore>) => void) {
  const store = createStore();
  overrides?.(store);

  return {
    store,
    ...(await render(
      <Provider store={store}>
        <FilePicker />
      </Provider>,
    )),
  };
}

describe("FilePicker", () => {
  test("ボタンが表示される", async () => {
    void renderPicker();

    await expect.element(page.getByText("ファイルポップアップから読み込み")).toBeInTheDocument();
  });

  test("ボタンがクリック可能", async () => {
    void renderPicker();

    const button = page.getByRole("button", {
      name: /ファイルポップアップから読み込み/,
    });
    await expect.element(button).toBeEnabled();
  });

  test("FSA 対応ブラウザでは hidden input が表示されない", async () => {
    void renderPicker();

    // showOpenFilePicker が使える環境では input[type=file] は描画されない
    const inputs = page.getByRole("textbox");
    await expect.element(inputs).not.toBeInTheDocument();
  });
});
