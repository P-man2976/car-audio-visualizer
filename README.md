# car-audio-visualizer

車載オーディオのスペクトログラムビジュアライザー。React Three Fiber による 3D 表示、radiko / HLS / ローカルファイルの再生に対応。

## Tech Stack

- **React 19** + TypeScript 5.9
- **Vite 8** (React Compiler enabled)
- **TanStack Start** (SSR) + **Cloudflare Workers**
- **shadcn/ui** (new-york, neutral) + Tailwind CSS v4
- **Jotai** — 状態管理
- **@react-three/fiber** + **@react-three/drei** — 3D ビジュアライザー
- **audiomotion-analyzer** — オーディオ解析
- **Biome 2.4.4** — フォーマット / リント
- **Vitest 4** — ユニットテスト (Node) + ブラウザテスト (Chromium)

## Getting Started

```bash
npm install
npm run dev      # 開発サーバー起動
```

## Scripts

| コマンド | 説明 |
|---------|------|
| `npm run dev` | Vite 開発サーバー (HMR) |
| `npm run build` | プロダクションビルド |
| `npm run preview` | ビルド済みアプリのプレビュー |
| `npm run lint` | Biome lint |
| `npm run format` | Biome format (check only) |
| `npx biome format --write src/` | フォーマット適用 (書き込み) |
| `npm run test` | ユニットテスト (`src/**/*.test.ts`) |
| `npm run test:browser` | ブラウザテスト (`src/**/*.browser.test.tsx`) |
| `npm run deploy` | ビルド + Cloudflare Workers デプロイ |

## Project Structure

```
src/
├── atoms/        # Jotai atoms・副作用
├── components/   # React コンポーネント
│   ├── ui/       # shadcn/ui プリミティブ
│   └── visualizer/ # 3D ビジュアライザー
├── hooks/        # カスタムフック
├── lib/          # ユーティリティ・純粋関数
├── pages/        # ページコンポーネント
├── routes/       # TanStack Router ルート定義
├── services/     # API / データ取得
└── types/        # 型定義
```

## Testing

- **ユニットテスト** (`*.test.ts`): `src/lib/`, `src/atoms/` のロジック検証 (Node 環境)
- **ブラウザテスト** (`*.browser.test.tsx`): `src/components/` のコンポーネント検証 (Chromium via Playwright)

コード変更時は対応するテストの追加・更新が必須。詳細は [AGENTS.md](AGENTS.md) 参照。

## Deploy

```bash
npm run deploy   # wrangler deploy → Cloudflare Workers (gcp:asia-northeast1)
```
