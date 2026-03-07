# 大学祭企画情報管理システム (Archive)

大学祭における企画情報の収集・管理・承認プロセスを統一し、Single Source of Truth を構築する Web アプリケーション。
企画担当者が情報を入力し、委員会による承認を経て公開用データが生成される。

## 主な機能

- 企画情報の入力・編集（TipTap リッチテキストエディタ）
- Draft → Submission → Published の承認ワークフロー
- 委員会による承認・差戻し・フィードバック
- 年度（イベント）単位のデータ管理とアーカイブ
- タグ・場所・締切のマスタ管理
- 公開データの CSV/JSON 出力

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

## セットアップ

### 前提条件

- Node.js 22+
- pnpm

### インストール

```bash
pnpm install
```

### 環境変数

`.dev.vars` を作成し、以下を設定:

```
BETTER_AUTH_SECRET=<認証用シークレット>
BETTER_AUTH_URL=http://localhost:5173
GOOGLE_CLIENT_ID=<Google OAuth クライアントID>
GOOGLE_CLIENT_SECRET=<Google OAuth クライアントシークレット>
```

### データベース初期化

```bash
pnpm migrate    # マイグレーション適用
pnpm seed       # 初期データ投入（任意）
```

### 開発サーバー起動

```bash
pnpm dev
```

## コマンド一覧

### 開発

```bash
pnpm dev              # 開発サーバー起動
pnpm build            # プロダクションビルド（tsc + vite build）
pnpm preview          # ビルド結果のプレビュー
pnpm deploy           # ビルド + Cloudflare へデプロイ
```

### データベース

```bash
pnpm migration        # スキーマからマイグレーション生成（drizzle-kit generate）
pnpm migrate          # ローカル D1 にマイグレーション適用
pnpm seed             # 初期データ投入
pnpm cf-typegen       # Cloudflare バインディングの型生成
```

### コード品質

```bash
pnpm test             # テスト実行（Vitest）
pnpm lint             # Lint（oxlint）
pnpm format           # フォーマット（oxfmt）
pnpm check            # Lint + フォーマットチェック
pnpm check:fix        # Lint + フォーマット自動修正
```

### スタイル

```bash
pnpm prepare          # Panda CSS コード生成（dev/build 前に自動実行）
```

## ディレクトリ構成

```
src/
├── domain/              # ドメイン層（スキーマ、ロジック、エラー定義）
├── application/
│   ├── command/         # 書き込み操作（ユースケース）
│   └── query/           # 読み取り操作（DTO + クエリ関数）
├── infrastructure/      # リポジトリ実装、DI、ドメインサービス実装
├── features/            # 機能別モジュール（TanStack Query 統合、UI コンポーネント）
├── routes/              # TanStack Router ファイルベースルーティング
├── components/ui/       # 共通 UI コンポーネント（Park UI）
├── db/                  # Drizzle スキーマ、マイグレーション
├── libs/                # 共通ユーティリティ（認証、Result 型、ID 生成）
├── theme/               # Panda CSS テーマ設定
└── test/                # テストユーティリティ
```

## ドキュメント

アーキテクチャの詳細（DDD設計、CQRSパターン、型システム、エラーハンドリング、実装パターン等）は [docs/architecture.md](docs/architecture.md) を参照。
