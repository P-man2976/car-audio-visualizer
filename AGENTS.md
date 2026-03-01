# Project Guidelines (car-audio-visualizer)

## Build and Test

```bash
npm install       # 依存インストール
npm run dev       # 開発サーバー (HMR)
npm run build     # tsc -b + vite build → dist/
npm run preview   # 本番ビルドのプレビュー
npm run lint      # Biome lint
npm run format    # Biome format
npm run test      # Vitest
```

> **作業終了時は必ず `lint → format → test → build` を実行してからコミットすること。**

## Tech Stack

| 役割 | ライブラリ |
|---|---|
| フレームワーク | React 19 + TypeScript 5.9 |
| ビルド | Vite 8 + `@vitejs/plugin-react` (React Compiler via Babel) |
| スタイル | Tailwind CSS v4 (`@tailwindcss/vite`) |
| UI コンポーネント | **shadcn/ui** (new-york / neutral / Tailwind v4 mode) |
| 3D レンダリング | `@react-three/fiber` + `@react-three/drei` |
| 状態管理 | Jotai |
| オーディオ解析 | `audiomotion-analyzer` |
| Linter/Formatter | Biome 2.4.4 (タブインデント・ダブルクォート) |

## Architecture

- **エントリー**: `index.html` → `src/main.tsx` → RouterProvider → `src/pages/HomePage.tsx`
- **ビジュアライザー**:
  - `src/components/Container.tsx` — R3F `<Canvas frameloop="demand">`
  - `src/components/Visualizer.tsx` — `VisualizerSwitch`（スタイル切替）
  - `src/components/visualizer/VisualizerStandard.tsx` — スタンダードスタイル
  - `src/components/visualizer/VisualizerKenwood.tsx` — DPX-5021M スタイル（11バンド）
  - `src/components/visualizer/spectrogramStore.ts` — 共有 Jotai atom
- **状態**: `src/atoms/` に Jotai atoms、`src/hooks/` に副作用
- **音声解析**: `src/atoms/audio.ts` — `AudioMotionAnalyzer` シングルトン

## Visualizer 実装ルール

- セルは `InstancedMesh` で描画（draw call 最小化）
- マテリアルは **`meshBasicMaterial`**（PBR 不要。`meshStandardMaterial` は GPU リソース圧迫で Context Lost を引き起こす）
- 色更新は `useFrame` 内の単一ループで `setColorAt` → `instanceColor.needsUpdate = true`
- `AudioMotionAnalyzer` のオプション: `mode: 6` (1/3オクターブ ANSI)、`fftSize: 8192`（上限固定）
- バンド選択: `BAND_INDICES` 配列でアナライザーの出力インデックスを明示指定

## UI (shadcn/ui) ルール

- **HeroUI v3 は削除済み**。新規コンポーネントは shadcn/ui を使用する。
- コンポーネント追加: `npx shadcn@latest add <name>` → `src/components/ui/`
- `components.json`: `style: "new-york"`, `baseColor: "neutral"`, Tailwind v4 モード
- shadcn ドキュメントは MCP (`mcp_shadcn`) を参照

## コーディングルール

- ESM のみ (`"type": "module"`)。CommonJS パターン禁止
- TypeScript strict モード (`tsconfig.app.json`)
- `@/` alias = `src/` (`vite.config.ts` + `tsconfig.app.json`)
- 外部ライブラリのドキュメントは Context7 (`mcp_io`) を優先
- テスト可能なロジックには必ず Vitest テストを添付・維持する

## Security

- 認証バックエンドなし。クライアントコードにシークレットを埋め込まない。
- 環境変数は Vite env flow (`import.meta.env`) のみ使用する。
