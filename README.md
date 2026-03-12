# 大学祭企画情報管理システム (Archive)

大学祭における企画情報の収集・管理・承認プロセスを統一し、Single Source of Truth を構築する Web アプリケーション。
企画担当者が情報を入力し、委員会による承認を経て公開用データが生成される。

## 主な機能

- 企画情報の入力・編集（TipTap リッチテキストエディタ）
- Draft → Submission → Published の承認ワークフロー
- 委員会による承認・差戻し・フィードバック
- 年度（イベント）単位のデータ管理とアーカイブ
- タグ・場所・締切のマスタ管理
- 公開データの CSV/XLSX/JSON 出力

## 技術スタック

| カテゴリ          | 技術                                     |
| ----------------- | ---------------------------------------- |
| フロントエンド    | React 19 + TanStack Start (SSR)          |
| UI コンポーネント | Park UI (Ark UI + Panda CSS)             |
| バックエンド      | Cloudflare Workers                       |
| データベース      | Cloudflare D1 (SQLite) + Drizzle ORM     |
| ストレージ        | Cloudflare R2                            |
| 認証              | Better Auth (Google OIDC, @toyo.jp 制限) |
| ルーティング      | TanStack Router (ファイルベース)         |
| サーバー状態      | TanStack Query                           |
| テスト            | Vitest                                   |
| Lint / Format     | oxlint + oxfmt                           |
| ビルド            | Vite, tsdown, Turborepo                  |
| パッケージ管理    | pnpm workspaces                          |

## モノレポ構成

```
archive/
├── apps/
│   └── web/                     # メイン Web アプリケーション
├── packages/
│   ├── domain/                  # ドメイン層（スキーマ、ロジック、エラー定義）
│   ├── application/             # アプリケーション層（Command / Query）
│   ├── infrastructure/          # インフラ層（DB、リポジトリ、認証、ストレージ）
│   ├── result/                  # Result 型（関数型エラーハンドリング）
│   ├── ui/                      # UI コンポーネント + Panda CSS プリセット
│   ├── styled-system/           # Panda CSS 生成出力
│   └── config/                  # 共通設定（TypeScript, oxlint）
└── docs/
    └── architecture.md          # アーキテクチャ設計書
```

### パッケージ詳細

| パッケージ | 説明 |
| --- | --- |
| `apps/web` | TanStack Start ベースのフルスタック Web アプリ。ルーティング、API、UI を統合 |
| `packages/domain` | 純粋なドメインモデル。Zod スキーマ、ドメインロジック、リポジトリインターフェース |
| `packages/application` | CQRS パターンのユースケース層。Command（書き込み）と Query（読み取り） |
| `packages/infrastructure` | Drizzle ORM リポジトリ実装、Better Auth 設定、R2 ストレージ、ドメインサービス |
| `packages/result` | `@praha/byethrow` ベースの Result 型ユーティリティ |
| `packages/ui` | 再利用可能な React コンポーネントと Panda CSS プリセット |
| `packages/styled-system` | Panda CSS の生成コード（トークン、レシピ、パターン） |
| `packages/config` | TypeScript / oxlint の共通設定 |

## セットアップ

### 前提条件

- Node.js 22+
- pnpm 10+

### インストール

```bash
pnpm install
```

### 環境変数

`apps/web/.dev.vars` を作成し、以下を設定:

```
BETTER_AUTH_SECRET=<認証用シークレット>
BETTER_AUTH_URL=http://localhost:5173
GOOGLE_CLIENT_ID=<Google OAuth クライアントID>
GOOGLE_CLIENT_SECRET=<Google OAuth クライアントシークレット>
```

### データベース初期化

```bash
pnpm --filter web migrate    # マイグレーション適用
pnpm --filter web seed       # 初期データ投入（任意）
```

### 開発サーバー起動

```bash
pnpm dev
```

## コマンド一覧

### ルート（モノレポ全体）

```bash
pnpm dev              # 全パッケージの開発サーバー起動（Turborepo）
pnpm build            # 全パッケージのビルド（Turborepo）
pnpm test             # 全パッケージのテスト実行（Turborepo）
pnpm lint             # 全パッケージの Lint（Turborepo）
pnpm check            # フォーマットチェック + Lint
pnpm check:fix        # フォーマット自動修正 + Lint 自動修正
```

### Web アプリ（apps/web）

```bash
pnpm --filter web dev         # 開発サーバー起動
pnpm --filter web build       # プロダクションビルド
pnpm --filter web deploy      # ビルド + Cloudflare へデプロイ
pnpm --filter web prepare     # Panda CSS コード生成
```

### データベース（apps/web）

```bash
pnpm --filter web migrate     # ローカル D1 にマイグレーション適用
pnpm --filter web seed        # 初期データ投入
pnpm --filter web cf-typegen  # Cloudflare バインディングの型生成
```

> DB スキーマ変更時は `packages/infrastructure/src/db/schema.ts` を編集後、`drizzle-kit generate` でマイグレーション生成。

## ドキュメント

アーキテクチャの詳細（DDD 設計、CQRS パターン、型システム、エラーハンドリング、実装パターン等）は [docs/architecture.md](docs/architecture.md) を参照。
