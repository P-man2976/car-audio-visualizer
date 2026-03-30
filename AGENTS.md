# Project Guidelines (car-audio-visualizer)

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

---

## Code Style

- TypeScript strict, ESM-only。**VitePlus** (`vp`): oxfmt (tab, double quotes), oxlint (type-aware)。
- Tailwind utility classes + **shadcn/ui** (new-york, neutral) — `src/components/ui/`。

## Architecture

- TanStack Start (SSR) + Cloudflare Workers。エントリ: `__root.tsx` → `index.tsx` → `HomePage.tsx`。
- Vite 8 + React Compiler (`babel-plugin-react-compiler`)。`@` → `src/`。
- PWA: `public/manifest.webmanifest` + `public/icon.svg`。Service Worker 未導入。

## Build and Test

| 操作           | コマンド                    | 説明                                                      |
| -------------- | --------------------------- | --------------------------------------------------------- |
| Dev server     | `npm run dev`               | Vite HMR dev server                                       |
| Build          | `npm run build`             | `tsgo -b --noEmit` + `vp build`                           |
| Lint           | `npm run lint`              | oxlint (type-aware)                                       |
| Format (write) | `npm run format -- --write` | oxfmt 書き込み                                            |
| Unit test      | `npm run test`              | Vitest (Node), `src/**/*.test.ts`                         |
| Browser test   | `npm run test:browser`      | Vitest (Chromium/Playwright), `src/**/*.browser.test.tsx` |

### Lint overrides

テストファイル (`**/*.test.ts`, `**/*.test.tsx`) は `lint.overrides` で `no-floating-promises` / `no-misused-spread` off。

## テスト必須ルール

**コード変更時は、対応するテストを必ず追加・更新すること。**

- `src/lib/` や `src/atoms/` → ユニットテスト (`*.test.ts`)
- `src/components/` → ブラウザテスト (`*.browser.test.tsx`)
- 新規ファイル → 対応テストも必ず作成。既存テスト破損 → 調査・修正（削除禁止）

### テストの注意事項

- `@/atoms/audio` はモジュールスコープで AudioContext を生成 → 必ず `vi.mock` する
- `atomWithIDB` atom は DataCloneError 回避のためプレーンな `atom()` でモック
- 重複 DOM 要素 → `.first()` 使用
- 空モック関数 → `/* noop stub */` コメント追加（oxlint noEmptyBlockStatements 対策）
- モックパターンの詳細は `.github/copilot-instructions.md` を参照

## Integration Points

- UI: **shadcn/ui** (`npx shadcn@latest add <name>`) + Tailwind CSS v4
- Routing: **TanStack Router** (`src/router.tsx`)
- State: **Jotai** (`src/atoms/`)
- Audio: **audiomotion-analyzer** (`src/atoms/audio.ts`)
- 3D: **@react-three/fiber** + **@react-three/drei** (`src/components/visualizer/`)
- Build: **VitePlus** (Vite 8) + React 19 + TypeScript (tsgo)
- Deploy: Cloudflare Workers (`wrangler deploy`, `gcp:asia-northeast1`)

## Project Conventions

- **コード変更時は対応するテストを必ず追加・更新すること。**
- MCP: `mcp_shadcn` (shadcn/ui), TanStack MCP, `mcp_io` (Context7 — 外部ライブラリドキュメント)
- `src/atoms/` Jotai atoms | `src/components/` React | `src/hooks/` hooks | `src/services/` API | `src/lib/` utils

## 3D Visualizer ルール

- `Canvas` は `frameloop="always"`。`<instancedMesh>` per-band + `useFrame` パターン。
- 詳細は `.github/copilot-instructions.md` を参照。

## Browser Automation

`agent-browser` で Web 自動操作: `open <url>` → `snapshot -i` → `click @e1` / `fill @e2 "text"` → re-snapshot。
