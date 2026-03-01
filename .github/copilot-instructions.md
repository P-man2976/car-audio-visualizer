# Copilot Instructions for car-audio-visualizer

## Project Overview

This is a React 19 + TypeScript + Vite app set up as a car audio visualizer, with React Compiler enabled. UI components use **shadcn/ui** (migrated from HeroUI v3) with styles matching the `2din-spectrogram` project. Tailwind CSS v4 is used for utility-first styling.

## 作業終了後のチェックリスト（必須）

作業が完了したら、コミット前に必ず以下をこの順番で実行すること：

```bash
npx biome format --write src/   # フォーマット適用
npm run lint                     # lint チェック（エラーがないこと）
npm run build                    # 型エラー・ビルドエラーがないこと
npm run test                     # 全テストがパスすること
```

`npm run format` は check only（書き込みなし）なので、整形は必ず `npx biome format --write` を使うこと。

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

### Tests
- Test runner: Vitest (`npm run test`).
- Implement features while adding/maintaining related tests in parallel where feasible.

### Linting
```bash
npm run lint
```
Uses Biome 2.4.4 for code linting.

### Code Formatting
```bash
npm run format
```
Uses Biome for automatic code formatting.

## Architecture

### Technology Stack
- **React 19** + **TypeScript 5.9**
- **Vite 8** with `@vitejs/plugin-react` and `@tailwindcss/vite`
- **shadcn/ui** (new-york style, neutral base, Tailwind v4 mode) — components in `src/components/ui/`
- **Biome 2.4.4** as primary formatter/linter, with ESLint flat config also present

### Runtime and Build Flow
1. `index.html` hosts the `#root` mount point.
2. `src/main.tsx` renders `<App />` via `createRoot` inside `StrictMode`.
3. `src/index.css` imports `tailwindcss`, `tw-animate-css`, and `shadcn/tailwind.css` (via `@tailwindcss/vite`). shadcn CSS variables are defined in `:root`.
4. `vite.config.ts` enables React Compiler through Babel (`babel-plugin-react-compiler`).
5. `npm run build` runs `tsc -b` (app + node tsconfigs) before `vite build`.

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
- ビジュアライザーの推奨実装は **ShaderMaterial + 単一 Plane**。
  `InstancedMesh` は使用しない。
  - `useFrame` 内で `mat.uniforms.uValues.value` を更新し `mat.uniformsNeedUpdate = true` を設定するだけでよい。
  - `uniforms` オブジェクトは `useMemo` で 1 回だけ生成すること。
  - `frameloop="always"` では `useFrame` が毎フレーム自動実行されるため `invalidate()` は不要。

あなたはURLが与えられた時、以下のコマンドでそのURLの内容をmardownで取得できる
`npx -y @mizchi/readability --format=md <url>`