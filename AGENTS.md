# Project Guidelines (car-audio-visualizer)

## 作業終了後のチェックリスト（必須）

作業が完了したら、コミット前に必ず以下をこの順番で実行すること：

```bash
npx biome format --write src/   # フォーマット適用
npm run lint                     # lint チェック（エラーがないこと）
npm run build                    # 型エラー・ビルドエラーがないこと
npm run test                     # 全ユニットテストがパスすること
npm run test:browser             # 全ブラウザテストがパスすること（コンポーネント変更時）
```

`npm run format` は check only（書き込みなし）なので、整形は必ず `npx biome format --write` を使うこと。

---

## Code Style
- TypeScript + React with strict settings; keep ESM-only imports/exports and avoid CommonJS.
- Follow Biome 2.4.4 formatting/linting defaults: **tab indentation and double quotes**.
- Use Tailwind utility classes for layout/styling.
- Use **shadcn/ui** (new-york style, neutral base) for UI primitives — components live in `src/components/ui/`.

## Architecture
- TanStack Start (SSR) + Cloudflare Workers。`index.html` / `src/main.tsx` は存在しない。
- Entry flow: `@tanstack/react-start/server-entry` → `src/routes/__root.tsx` → `src/routes/index.tsx` → `src/pages/HomePage.tsx`.
- Vite 8 uses React Compiler via Babel plugin in `vite.config.ts`; avoid patterns that conflict with it.
- `@` alias resolves to `src/` (configured in `vite.config.ts` and `tsconfig.app.json`).
- PWA: `public/manifest.webmanifest` + `public/icon.svg`。Service Worker は未導入。

## Build and Test
- Install: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build` (runs `tsc -b` then `vite build`)
- Preview: `npm run preview`
- Lint: `npm run lint`
- Format (check only): `npm run format`
- Format (write): `npx biome format --write src/`
- Unit test: `npm run test` (Vitest, Node 環境, `src/**/*.test.ts`)
- Browser test: `npm run test:browser` (Vitest, Chromium via Playwright, `src/**/*.browser.test.tsx`)

## テスト必須ルール

**コード変更時は、対応するテストを必ず追加・更新すること。**

- `src/lib/` や `src/atoms/` のロジック変更 → **ユニットテスト** (`*.test.ts`) を追加・更新
- `src/components/` のコンポーネント変更 → **ブラウザテスト** (`*.browser.test.tsx`) を追加・更新
- 新規ファイル作成時 → 対応するテストファイルも必ず作成
- 既存テストが壊れた場合 → 原因を調査し修正（テストを削除しない）

### ユニットテストのモックパターン
```typescript
// fetch モック
vi.stubGlobal("fetch", vi.fn());
afterEach(() => vi.unstubAllGlobals());

// 環境変数モック
vi.stubEnv("VITE_API_KEY", "test-key");

// モジュールモック
vi.mock("idb-keyval", () => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() }));

// Jotai atom テスト
import { createStore } from "jotai";
const store = createStore();
store.set(myAtom, value);
expect(store.get(myAtom)).toBe(expected);
```

### ブラウザテストのパターン
```typescript
import { render } from "vitest-browser-react";
import { page, userEvent } from "@vitest/browser/context";

// 副作用のあるモジュールは vi.mock で完全モック
vi.mock("@/atoms/audio", () => ({ audioAtom: atom(null) }));

// Jotai Provider でラップ
import { Provider, createStore } from "jotai";
const store = createStore();
render(<Provider store={store}><MyComponent /></Provider>);

// ロケーター
page.getByRole("button", { name: /submit/i });
page.getByText("テキスト");
page.getByTestId("test-id");
```

### テストの注意事項
- `@/atoms/audio` はモジュールスコープで AudioContext を生成するため、必ず `vi.mock` すること
- `atomWithIDB` を使用する atom は DataCloneError を避けるためプレーンな `atom()` でモック
- 重複 DOM 要素がある場合は `.first()` を使用
- 空のモック関数ボディには `/* noop stub */` コメントを追加（Biome lint 対策）

## UI Conventions (shadcn/ui)
- **HeroUI v3 は削除済み**。新規コンポーネントは `npx shadcn@latest add <name>` で `src/components/ui/` に生成する。
- `components.json`: `style: "new-york"`, `baseColor: "neutral"`, Tailwind v4 モード。
- スタイル変更は `src/components/ui/*.tsx` 内の `cva` バリアント定義を直接編集する。
- shadcn ドキュメントには MCP (`mcp_shadcn`) を使用する。

## 3D Visualizer (React Three Fiber) ルール
- `Canvas` は `frameloop="always"` を使うこと。`demand` は `invalidate()` の管理が複雑になり得策でない。
- ビジュアライザーの実装は **`<instancedMesh>` per-band + `useFrame`** パターン。
  - 1 周波数バンドにつき 1 つの `<instancedMesh>` で左右 2 列 × 全セルをまとめて描画する（`ShaderMaterial` は使わない）。
  - 共有ジオメトリ (`THREE.PlaneGeometry`) はモジュールスコープで生成し、全バンドで再利用する。
  - `useEffect` でインスタンスの位置（`setMatrixAt`）と初期色（`setColorAt`）を設定する。
  - `useFrame` 内では `store.get(spectrogramAtom)` で値を読み、`setColorAt` で各インスタンスの色を更新する。
  - ルートコンポーネントの `useFrame` で `store.set(spectrogramAtom, getBars())` を呼ぶ。
  - `useMemo(() => new THREE.Color(), [])` でカラーオブジェクトをキャッシュする。
- ビジュアライザーの周波数バンドは `audioMotionAnalyzer.getBars()` で取得し、  
  `BAND_INDICES` で目的の帯域を選択する。`mode: 6`（ANSI 1/3 オクターブ）時は約 30 本返る。
- `<Line>` / `<Text>` などの drei コンポーネントは `<mesh>` の子に置かない。コンテナには `<group>` を使うこと。

## Integration Points
- UI stack: **shadcn/ui** + `tailwindcss` + `@tailwindcss/vite`
- Routing: **TanStack Router** (`src/router.tsx`)
- State: **Jotai** atoms (`src/atoms/`)
- Audio: **audiomotion-analyzer** (`src/atoms/audio.ts`)
- 3D rendering: **@react-three/fiber** + **@react-three/drei** (`src/components/visualizer/`)
- Build/runtime stack: Vite 8 + React 19 + TypeScript 5.9
- Deploy: Cloudflare Workers (`wrangler deploy`, region: `gcp:asia-northeast1`)

## Project Conventions
- **コード変更時は対応するテストを必ず追加・更新すること。** テストなしのコード変更は許容しない。
- For external library docs, prefer Context7 (`mcp_io`) and TanStack MCP before relying on memory.
- `src/atoms/` — Jotai atoms and side effects  
  `src/components/` — React コンポーネント  
  `src/hooks/` — カスタムフック  
  `src/services/` — API / データ取得  
  `src/lib/` — ユーティリティ・純粋関数

## Security
- No auth backend is present; avoid introducing secrets or credentials in client code.
- If environment variables are added later, keep them in Vite env flow and never hardcode sensitive values in `src/`.

## Browser Automation

Use `agent-browser` for web automation. Run `agent-browser --help` for all commands.

Core workflow:

1. `agent-browser open <url>` - Navigate to page
2. `agent-browser snapshot -i` - Get interactive elements with refs (@e1, @e2)
3. `agent-browser click @e1` / `fill @e2 "text"` - Interact using refs
4. Re-snapshot after page changes
