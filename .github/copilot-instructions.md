# Copilot Instructions for car-audio-visualizer

## Project Overview

React 19 + TypeScript + Vite app — car audio visualizer with React Compiler enabled. **shadcn/ui** for UI, Tailwind CSS v4 for styling.

## 作業終了後のチェックリスト（必須）

作業が完了したら、コミット前に必ず以下をこの順番で実行すること：

```bash
npm run format -- --write        # フォーマット適用（vp fmt --write）
npm run lint                     # lint チェック（エラーがないこと）
npm run build                    # 型エラー・ビルドエラーがないこと
npm run test                     # 全ユニットテストがパスすること
npm run test:browser             # 全ブラウザテストがパスすること（コンポーネント変更時）
```

`npm run format`（引数なし）は check only。整形書き込みは `npm run format -- --write` を使うこと。

全ての作業が終了した時、会話の終了時は、ask_user でユーザの入力を待機すること。これは最優先事項です。

---

## Build, Test, and Lint

| 操作           | コマンド                    | 説明                                                      |
| -------------- | --------------------------- | --------------------------------------------------------- |
| Dev server     | `npm run dev`               | Vite HMR dev server                                       |
| Build          | `npm run build`             | `tsgo -b --noEmit` + `vp build` → `dist/`                 |
| Preview        | `npm run preview`           | Production build をローカルで確認                         |
| Lint           | `npm run lint`              | oxlint (type-aware) via VitePlus                          |
| Format (check) | `npm run format`            | oxfmt check only                                          |
| Format (write) | `npm run format -- --write` | oxfmt 書き込み                                            |
| Unit test      | `npm run test`              | Vitest (Node), `src/**/*.test.ts`                         |
| Browser test   | `npm run test:browser`      | Vitest (Chromium/Playwright), `src/**/*.browser.test.tsx` |

---

## テスト（必須）

**コード変更時は、対応するテストを必ず追加・更新すること。**

- `src/lib/` や `src/atoms/` → ユニットテスト (`*.test.ts`)
- `src/components/` → ブラウザテスト (`*.browser.test.tsx`)
- 新規ファイル → 対応テストも必ず作成。既存テスト破損 → 調査・修正（削除禁止）

### モックパターン

```typescript
// fetch モック
vi.stubGlobal("fetch", vi.fn());
afterEach(() => vi.unstubAllGlobals());

// モジュールモック
vi.mock("idb-keyval", () => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() }));

// Jotai atom テスト
import { createStore } from "jotai";
const store = createStore();
store.set(myAtom, value);
expect(store.get(myAtom)).toBe(expected);

// ブラウザテスト
import { render } from "vitest-browser-react";
import { page, userEvent } from "@vitest/browser/context";
vi.mock("@/atoms/audio", () => ({ audioAtom: atom(null) }));
render(<Provider store={store}><MyComponent /></Provider>);
page.getByRole("button", { name: /submit/i });
```

### テストの注意事項

- `@/atoms/audio` はモジュールスコープで AudioContext を生成するため、必ず `vi.mock` すること
- `atomWithIDB` を使用する atom は DataCloneError を避けるためプレーンな `atom()` でモック
- 重複 DOM 要素がある場合は `.first()` を使用
- 空のモック関数ボディには `/* noop stub */` コメントを追加（oxlint noEmptyBlockStatements 対策）

## Architecture

- **React 19** + **TypeScript** (strict, ESM-only) + **VitePlus** (Vite 8, oxlint, oxfmt, Vitest 4)
- **shadcn/ui** (new-york, neutral, Tailwind v4) — `src/components/ui/`
- **React Compiler** (`babel-plugin-react-compiler`) 有効
- TanStack Start (SSR) + Cloudflare Workers — エントリ: `__root.tsx` → `index.tsx` → `HomePage.tsx`
- `src/index.css` を `?url` で `__root.tsx` から読み込み。`@import "tailwindcss"` + shadcn CSS 変数
- Build: `tsgo -b --noEmit` + `vp build`。Deploy: `wrangler deploy` → Cloudflare Workers (`gcp:asia-northeast1`)

## Key Conventions

- **shadcn/ui**: `npx shadcn@latest add <name>` で追加。`components.json` に設定済み (new-york, neutral, Tailwind v4)。HeroUI v3 は削除済み。
- **TypeScript**: strict, ESM-only (`"type": "module"`)。bundler-mode (`moduleResolution: "bundler"`)。
- **Lint/Format**: oxfmt (tab, double quotes)。oxlint (type-aware)。テストファイルは `lint.overrides` で `no-floating-promises` / `no-misused-spread` off。
- **Styling**: Tailwind utility classes + shadcn/ui。カラートークン: `bg-neutral-500/40` (interactive), `bg-neutral-950/50 backdrop-blur-md` (overlays)。
- **MCP**: `mcp_shadcn` (shadcn/ui), TanStack MCP, `mcp_io` (Context7 — 外部ライブラリドキュメント)。

### 3D Visualizer (React Three Fiber) ルール

- `Canvas` は `frameloop="always"` を使うこと。`demand` は `invalidate()` の管理が複雑になり得策でない。
- ビジュアライザーの実装は **`<instancedMesh>` per-band + `useFrame`** パターン。
  - 1 周波数バンドにつき 1 つの `<instancedMesh>` で左右 2 列 × 全セルをまとめて描画する（`ShaderMaterial` は使わない）。
  - 共有ジオメトリ (`THREE.PlaneGeometry`) はモジュールスコープで生成し、全バンドで再利用する。
  - `useEffect` でインスタンスの位置（`setMatrixAt`）と初期色（`setColorAt`）を設定する。
  - `useFrame` 内では `store.get(spectrogramAtom)` で値を読み、`setColorAt` で各インスタンスの色を更新する。
  - `useMemo(() => new THREE.Color(), [])` でカラーオブジェクトをキャッシュする。
  - ルートコンポーネントの `useFrame` で `store.set(spectrogramAtom, getBars())` を呼ぶ。
  - `frameloop="always"` では `useFrame` が毎フレーム自動実行されるため `invalidate()` は不要。

### PWA

- `public/manifest.webmanifest` (`display: "standalone"`, `orientation: "landscape"`) + `public/icon.svg`。
- Service Worker は未導入。必要に応じて `vite-plugin-pwa` を追加可能。

あなたはURLが与えられた時、以下のコマンドでそのURLの内容をmardownで取得できる
`npx -y @mizchi/readability --format=md <url>`
