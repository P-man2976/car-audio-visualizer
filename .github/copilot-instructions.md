# Copilot Instructions for car-audio-visualizer

## Project Overview

This is a React 19 + TypeScript + Vite app set up as a car audio visualizer, with React Compiler enabled. UI components use **shadcn/ui** (migrated from HeroUI v3) with styles matching the `2din-spectrogram` project. Tailwind CSS v4 is used for utility-first styling.

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

全ての作業が終了したら、ask_user でユーザの入力を待機すること。

---

## Build, Test, and Lint

### Development Server
```bash
npm run dev
```
Starts Vite dev server with HMR (Hot Module Replacement) enabled.

### Build for Production
```bash
npm run build
```
Runs TypeScript compiler check (`tsc -b`) followed by Vite build. Outputs to `dist/` directory.

### Preview Production Build
```bash
npm run preview
```
Serves the production build locally for testing.

### Linting
```bash
npm run lint
```
Uses Biome 2.4.4 for code linting.

### Code Formatting
```bash
npm run format     # check only
npx biome format --write src/   # 実際に書き込み
```

---

## テスト（必須）

### テスト必須ルール

**コード変更時は、対応するテストを必ず追加・更新すること。**

- `src/lib/` や `src/atoms/` のロジック変更 → **ユニットテスト** (`*.test.ts`) を追加・更新
- `src/components/` のコンポーネント変更 → **ブラウザテスト** (`*.browser.test.tsx`) を追加・更新
- 新規ファイル作成時 → 対応するテストファイルも必ず作成
- 既存テストが壊れた場合 → 原因を調査し修正（テストを削除しない）

### テスト構成

| 種別 | コマンド | 設定ファイル | パターン | 環境 |
|------|---------|-------------|---------|------|
| ユニットテスト | `npm run test` | `vitest.config.ts` (project: unit) | `src/**/*.test.ts` | Node |
| ブラウザテスト | `npm run test:browser` | `vitest.config.ts` (project: browser) | `src/**/*.browser.test.tsx` | Chromium (Playwright) |

### ユニットテスト (`*.test.ts`)

- 純粋関数・ユーティリティ・atom ロジックの検証
- `vitest` の `describe` / `test` / `expect` を使用
- テストファイルは実装ファイルと同じディレクトリに配置（例: `src/lib/utils.ts` → `src/lib/utils.test.ts`）

**モックパターン:**
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

### ブラウザテスト (`*.browser.test.tsx`)

- React コンポーネントの描画・操作・表示の検証
- `vitest-browser-react` の `render` + `@vitest/browser/context` の `page` / `userEvent` を使用
- 実ブラウザ (Chromium) で実行

**テスト作成パターン:**
```typescript
import { render } from "vitest-browser-react";
import { page, userEvent } from "@vitest/browser/context";

// 副作用のあるモジュールは vi.mock で完全モック
vi.mock("@/atoms/audio", () => ({ audioAtom: atom(null) }));

// 子コンポーネントのスタブ
vi.mock("@/components/ChildComponent", () => ({
  ChildComponent: () => <div data-testid="child-stub" />,
}));

// Jotai Provider でラップ
import { Provider, createStore } from "jotai";
const store = createStore();
render(<Provider store={store}><MyComponent /></Provider>);

// ロケーター
page.getByRole("button", { name: /submit/i });
page.getByText("テキスト");
page.getByTestId("test-id");
```

**注意事項:**
- `@/atoms/audio` はモジュールスコープで AudioContext を生成するため、必ず `vi.mock` すること
- `atomWithIDB` を使用する atom は DataCloneError を避けるためプレーンな `atom()` でモック
- 重複 DOM 要素がある場合は `.first()` を使用
- 空のモック関数ボディには `/* noop stub */` コメントを追加（Biome lint 対策）

## Architecture

### Technology Stack
- **React 19** + **TypeScript 5.9**
- **Vite 8** with `@vitejs/plugin-react` and `@tailwindcss/vite`
- **shadcn/ui** (new-york style, neutral base, Tailwind v4 mode) — components in `src/components/ui/`
- **Biome 2.4.4** as primary formatter/linter, with ESLint flat config also present
- **Vitest 4** — ユニットテスト (Node) + ブラウザテスト (Chromium via `vitest-browser-react` + `@vitest/browser-playwright`)

### Runtime and Build Flow
1. TanStack Start (SSR) + Cloudflare Workers — `index.html` / `src/main.tsx` は存在しない。HTML シェルは `src/routes/__root.tsx` の `shellComponent` が生成する。
2. エントリ: `@tanstack/react-start/server-entry` → `src/routes/__root.tsx` → `src/routes/index.tsx` → `src/pages/HomePage.tsx`。
3. `src/index.css` を `?url` サフィックスで `__root.tsx` から読み込み。`@import "tailwindcss"` + shadcn CSS 変数を定義。
4. `vite.config.ts` で React Compiler (`babel-plugin-react-compiler`) を有効化。Cloudflare Workers SSR は `@cloudflare/vite-plugin` で設定。
5. `npm run build` は `vite build` のみ（TanStack Start が tsc チェックを統合）。
6. デプロイ: `wrangler deploy` → Cloudflare Workers (`gcp:asia-northeast1`)。

### UI Composition Pattern
- Uses shadcn/ui flat exports: `CardHeader`, `CardContent`, `CardFooter`, `CardTitle`, `CardDescription`, `AvatarFallback`, `AvatarImage`, etc.
- Import from `@/components/ui/<component>` (e.g. `import { Button } from "@/components/ui/button"`).
- `@` alias resolves to `src/` (configured in `vite.config.ts` and `tsconfig.app.json`).
- Styles are tuned to match `2din-spectrogram`: default button `bg-neutral-500/40`, sheet overlay `bg-neutral-950/30`, sheet content `bg-neutral-950/50 backdrop-blur-md`, slider thumb hidden until hover.

## Key Conventions

### shadcn/ui ガイドライン
- **HeroUI v3 は削除済み**。新規コンポーネントは shadcn/ui を使用すること。
- コンポーネント追加は `npx shadcn@latest add <name>` で `src/components/ui/` に生成する。
- `components.json` に設定済み: `style: "new-york"`, `baseColor: "neutral"`, Tailwind v4 モード (`"config": ""`)。
- スタイル変更は `src/components/ui/*.tsx` 内の `cva` バリアント定義を直接編集する。
- shadcn ドキュメントには MCP (`mcp_shadcn`) を使用する。

### TypeScript and Module Rules
- TypeScript is strict in both `tsconfig.app.json` and `tsconfig.node.json`.
- ESM-only project (`"type": "module"`); avoid CommonJS patterns.
- App code uses bundler-mode options (`moduleResolution: "bundler"`, `allowImportingTsExtensions: true`, `noEmit: true`).

### Linting/Formatting Expectations
- Biome uses tab indentation and double quotes.
- Key enforced rules include no `any`, no CommonJS, hooks at top level, and exhaustive deps warnings.
- Import organization is enabled through Biome assist actions.

### Styling Convention
- Use Tailwind CSS utility classes for layout/spacing/styling in React components.
- Use shadcn/ui components for UI primitives and combine them with Tailwind class names when composing screens.
- Color tokens follow 2din-spectrogram conventions: `bg-neutral-500/40` (default interactive), `bg-neutral-950/50 backdrop-blur-md` (overlays/sheets), status badges use `bg-green-600/60 text-green-100`, `bg-yellow-600/60 text-yellow-100`, etc.

### MCP servers

- You can access the MCP servers to get more information about the library and its usage. Here is a list of MCP supported libraries:
- **shadcn/ui** (`mcp_shadcn`) — preferred UI library for this project
- tanstack
- Context7 (`mcp_io`) for up-to-date external library docs when needed.
- HeroUI v3 MCP は参照不要（削除済み）。

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
- `public/manifest.webmanifest` に Web App Manifest を配置。`display: "standalone"`, `orientation: "landscape"`。
- `public/icon.svg` がアプリアイコン（SVG、any + maskable）。
- `__root.tsx` の `head()` で `<link rel="manifest">`, `<meta name="theme-color">`, `apple-mobile-web-app-*` を設定済み。
- Service Worker は未導入（Cloudflare Workers SSR ではオフラインキャッシュの実益が薄いため）。必要に応じて `vite-plugin-pwa` または手動 SW を追加可能。

あなたはURLが与えられた時、以下のコマンドでそのURLの内容をmardownで取得できる
`npx -y @mizchi/readability --format=md <url>`

## Browser Automation

Use `agent-browser` for web automation. Run `agent-browser --help` for all commands.

### Core Workflow
1. `agent-browser open <url>` - Navigate to page
2. `agent-browser snapshot -i` - Get interactive elements with refs (@e1, @e2)
3. `agent-browser click @e1` / `fill @e2 "text"` - Interact using refs (deterministic)
4. `agent-browser diff snapshot` - Verify actions changed page state
5. Re-snapshot after page changes

### Key Features

**Element Interaction (ref-based):**
- `snapshot -i` — Take accessibility tree snapshot with refs (`@e1`, `@e2`, etc)
- `click @e1` / `dblclick` / `tap` — Click/double-click/tap (iOS)
- `fill @e1 "text"` — Clear and fill input
- `press Enter` — Press key
- `hover @e1` / `focus @e1` — Hover/focus
- `check/uncheck @e1` — Checkbox operations

**Semantic Selectors (human-readable):**
- `find role button click --name "Submit"` — Find by ARIA role + name
- `find label "Email" fill "test@test.com"` — Find by label text
- `find text "Welcome" hover` — Find by visible text
- `find testid "my-input" fill "value"` — Find by data-testid

**Verification (Diffing):**
- `diff snapshot` — Line-level text diff against last snapshot
- `diff snapshot --baseline baseline.txt` — Compare against saved file
- `diff screenshot --baseline before.png` — Pixel-level visual diff (red = changed pixels)
- `diff url URL1 URL2 --screenshot` — Compare two pages

**Session & State Management:**
- `--session-name <name>` — Auto-save/restore cookies & localStorage
- `--profile <path>` — Persistent browser profile directory
- `auth save <name> --url <url> --username <u> --password-stdin` — Vault credentials (encrypted)
- `auth login <name>` — Use saved credentials
- `state save/load <path>` — Export/import session state

**Performance & Debug:**
- `profiler start` → `profiler stop trace.json` — Chrome DevTools trace (view in Perfetto UI)
- `trace start/stop` — DevTools trace recording
- `record start/stop video.webm` — Video recording
- `console` / `errors` — View console logs & errors
- `screenshot [path]` / `--annotate` — Screenshot with element labels

**Advanced:**
- `--cdp 9222` / `--auto-connect` — Connect to existing Chrome via DevTools Protocol
- `-p ios --device "iPhone 16 Pro"` — iOS Simulator Safari control (requires Appium)
- `--allowed-domains "example.com,*.example.com"` — Domain allowlist (block data exfiltration)
- `--action-policy policy.json` — Gate dangerous actions (eval, download, upload)
- `--confirm-actions eval,download` — Require manual approval for actions
- `--content-boundaries` — Mark untrusted page output with nonce boundaries
- `--max-output 50000` — Truncate large page outputs to prevent context flooding
- `--headers '{"Authorization": "Bearer <token>"}'` — Add HTTP headers scoped to origin
- `AGENT_BROWSER_STREAM_PORT=9223` — Stream viewport via WebSocket (live preview)

### Token Efficiency
- **Text output ~200-400 tokens** vs DOM JSON ~3000-5000 tokens
- **Refs eliminate element re-query** — snapshot captures state once, use refs for all actions
- **Compact format** — Accessibility tree only, LLM-friendly parsing

### Command Chaining
```bash
agent-browser open example.com && \
  agent-browser wait --load networkidle && \
  agent-browser snapshot -i && \
  agent-browser fill @e1 "text" && \
  agent-browser diff snapshot
```

### Security (Production-ready)
- **Auth Vault** — Passwords encrypted AES-256-GCM, never passed to LLM context
- **Content Boundaries** — Untrusted page output wrapped with nonce markers
- **Domain Allowlist** — Block navigations & sub-resources to non-allowed domains
- **Action Policy** — Restrict dangerous operations (eval, download, upload)
- **Confirmation Gating** — Require explicit approval for high-risk actions
- **Output Limits** — Cap page-sourced content to prevent context overflow

### Install
```bash
npm install -g agent-browser    # All platforms (fastest)
# or
npx agent-browser open example.com
```