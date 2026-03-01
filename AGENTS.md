# Project Guidelines (car-audio-visualizer)

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

## Code Style
- TypeScript + React with strict settings; keep ESM-only imports/exports and avoid CommonJS.
- Follow Biome 2.4.4 formatting/linting defaults: **tab indentation and double quotes**.
- Use Tailwind utility classes for layout/styling.
- Use **shadcn/ui** (new-york style, neutral base) for UI primitives — components live in `src/components/ui/`.

## Architecture
- Entry flow: `index.html` → `src/main.tsx` → TanStack Router → `src/pages/HomePage.tsx`.
- Vite 8 uses React Compiler via Babel plugin in `vite.config.ts`; avoid patterns that conflict with it.
- `@` alias resolves to `src/` (configured in `vite.config.ts` and `tsconfig.app.json`).

## Build and Test
- Install: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build` (runs `tsc -b` then `vite build`)
- Preview: `npm run preview`
- Lint: `npm run lint`
- Format (check only): `npm run format`
- Format (write): `npx biome format --write src/`
- Test: `npm run test` (Vitest)

## UI Conventions (shadcn/ui)
- **HeroUI v3 は削除済み**。新規コンポーネントは `npx shadcn@latest add <name>` で `src/components/ui/` に生成する。
- `components.json`: `style: "new-york"`, `baseColor: "neutral"`, Tailwind v4 モード。
- スタイル変更は `src/components/ui/*.tsx` 内の `cva` バリアント定義を直接編集する。
- shadcn ドキュメントには MCP (`mcp_shadcn`) を使用する。

## 3D Visualizer (React Three Fiber) ルール
- `Canvas` は `frameloop="always"` を使うこと。`demand` は `invalidate()` の管理が複雑になり得策でない。
- ビジュアライザーの実装は **`<Plane>` per-cell + `useFrame`** パターン（2din-spectrogram と同方式）。
  - `InstancedMesh` と `ShaderMaterial` は使わない（どちらも問題が発生した）。
  - ルートコンポーネントの `useFrame` で `store.set(spectrogramAtom, getBars())` を呼ぶ。
  - セルコンポーネントは `store.get(spectrogramAtom)` で値を読み `matRef.current.color.set(...)` で更新する。
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

## Project Conventions
- Add/maintain related tests while implementing features whenever testable logic exists.
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
