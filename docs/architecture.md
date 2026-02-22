# アーキテクチャ設計書

**プロジェクト**: 大学祭企画情報管理システム
**最終更新**: 2026-02-23
**バージョン**: 1.1.0

---

## 目次

1. [概要](#概要)
2. [アーキテクチャ原則](#アーキテクチャ原則)
3. [全体構成](#全体構成)
4. [CQRS パターン](#cqrs-パターン)
5. [ディレクトリ構造](#ディレクトリ構造)
6. [レイヤー設計](#レイヤー設計)
7. [型システム設計](#型システム設計)
8. [エラーハンドリング戦略](#エラーハンドリング戦略)
9. [実装パターン](#実装パターン)
10. [データフロー](#データフロー)
11. [権限管理](#権限管理)
12. [テスト戦略](#テスト戦略)
13. [参考資料](#参考資料)

---

## 概要

本システムは、大学祭における企画情報の収集・管理・承認プロセスを統一し、Single Source of Truth を構築する Web アプリケーションです。

### 技術スタック

- **Frontend**: React 19 + TanStack Start (SSR)
- **Backend**: Cloudflare Workers (Edge Runtime)
- **Database**: Cloudflare D1 (SQLite) + Drizzle ORM
- **Storage**: Cloudflare R2
- **Auth**: Better Auth (Google OIDC)
- **Styling**: Panda CSS + Park UI
- **Type Safety**: TypeScript + Zod
- **Error Handling**: `@praha/byethrow` (Result型)

### 設計方針

- **Domain-Driven Design (DDD)**: ドメインロジックを中心に据えた設計
- **CQRS (Command Query Responsibility Segregation)**: 読み取りと書き込みの責務分離
- **Functional Programming**: 純粋関数とイミュータブルなデータ構造
- **Type Safety**: Zod スキーマによるランタイムバリデーション + Brand型
- **Result型**: 例外を使わない安全なエラーハンドリング

---

## アーキテクチャ原則

### 1. レイヤー分離

各レイヤーは明確な責務を持ち、下位レイヤーへの依存のみ許可します。

```
Presentation → Application (Command/Query) → Domain
                     ↓
               Infrastructure
```

**CQRS パターン**: Application層をCommand（書き込み）とQuery（読み取り）に分離し、それぞれ異なる最適化を行います。

### 2. JSONシリアライズ可能性

すべてのドメインオブジェクトは純粋なデータ（POJO）として定義し、クラスメソッドを持ちません。

- ✅ `type Project = { id: string, name: string, ... }`
- ❌ `class Project { submit() { ... } }`

### 3. 純粋関数によるロジック実装

ビジネスロジックは純粋関数として実装し、副作用を持ちません。

```typescript
// ✅ 純粋関数
export const canSubmit = (project: Project): Result<true, ProjectError> => {
  return project.activeSubmissionId === null
    ? Result.succeed(true)
    : Result.fail(projectError("ALREADY_SUBMITTED", "既に提出済みです"));
};

// ❌ 副作用を持つメソッド
class Project {
  submit() {
    this.activeSubmissionId = generateId(); // 状態変更
  }
}
```

### 4. 依存性注入（DI）

リポジトリなどの依存は、インスタンス化せず関数引数として注入します。

```typescript
// ✅ DI
export const submitProject = (deps: Dependencies, input: Input) => { ... }

// ❌ 直接インスタンス化
export const submitProject = (input: Input) => {
  const repo = new ProjectRepository() // NG
}
```

### 5. Zodスキーマからの型派生

型定義を手書きせず、Zodスキーマから派生させます。

```typescript
// ✅ Zodスキーマ → 型派生
export const projectSchema = z.object({ ... })
export type Project = z.infer<typeof projectSchema>

// ❌ 手書き型定義
export type Project = { ... }
```

### 6. Brand型によるID管理

文字列IDは Brand型 で管理し、取り違えを防ぎます。

```typescript
export const projectIdSchema = z.string().brand<"ProjectId">();
export type ProjectId = z.infer<typeof projectIdSchema>;

// これにより、ProjectId と OrgId を間違えるとコンパイルエラー
```

### 7. Result型によるエラーハンドリング

例外（`throw`）を使わず、Result型でエラーを返します。

```typescript
// ✅ Result型
export const canSubmit = (project: Project): Result<true, ProjectError> => { ... }

// ❌ 例外throw
export const canSubmit = (project: Project): void => {
  if (...) throw new Error('...')
}
```

---

## 全体構成

### レイヤーアーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│         Presentation Layer (React + TanStack)       │
│  ┌──────────────┐  ┌──────────────┐                │
│  │   routes/    │  │ components/  │                │
│  │ - loader     │  │  (React 19)  │                │
│  │ - action     │  │              │                │
│  └──────────────┘  └──────────────┘                │
│                                                      │
│  責務: UI表示・ユーザーインタラクション              │
└─────────────────────────────────────────────────────┘
         │                           │
         │ loader                    │ action
         │ (読み取り)                │ (書き込み)
         ▼                           ▼
┌──────────────────┐        ┌──────────────────┐
│  Query Service   │        │  Command (UC)    │
│  application/    │        │  application/    │
│    query/        │        │    command/      │
│                  │        │                  │
│  - DTO定義       │        │  - Use Cases     │
│  - JOIN可能      │        │  - DI受け取り    │
│  - 表示最適化    │        │  - ビジネス      │
│                  │        │    フロー調整    │
└──────────────────┘        └──────────────────┘
         │                           │
         │ 直接DB                    │ Repository
         │ (Drizzle)                 ▼
         │                  ┌──────────────────┐
         │                  │  Domain Layer    │
         │                  │  domain/         │
         │                  │  - schema.ts     │
         │                  │  - logic.ts      │
         │                  │  - errors.ts     │
         │                  └──────────────────┘
         │                           │
         └───────────┬───────────────┘
                     ▼
         ┌─────────────────────────┐
         │  Infrastructure Layer   │
         │  infrastructure/        │
         │  - repositories/        │
         │  - di.ts                │
         └─────────────────────────┘
                     │
                     ▼
              ┌─────────────┐
              │  Database   │
              │  (D1/ORM)   │
              └─────────────┘
```

---

## CQRS パターン

### Command Query Responsibility Segregation

読み取り（Query）と書き込み（Command）の責務を分離し、それぞれ異なる最適化を行います。

### 設計原則

| 側面             | Command (書き込み)             | Query (読み取り)           |
| ---------------- | ------------------------------ | -------------------------- |
| **目的**         | ビジネスロジック実行、状態変更 | データ表示                 |
| **レイヤー**     | `application/command/`         | `application/query/`       |
| **使用場所**     | ルーターの`action`             | ルーターの`loader`         |
| **データソース** | Repository (集約単位)          | 直接DB (JOIN可能)          |
| **戻り値**       | 集約モデル（Domain型）         | DTO（表示用型）            |
| **制約**         | 集約の不変条件を守る           | 制約なし（読み取り専用）   |
| **最適化**       | トランザクション、整合性       | パフォーマンス、キャッシュ |
| **スキーマ**     | Domain schemaを使用            | zod schemaでDTO定義        |

### Command（コマンド）

**責務**: ビジネスルールを守りながら状態を変更する

**特徴**:

- 集約の不変条件をチェック
- Repositoryを通じて永続化
- トランザクション境界を持つ
- ドメインロジックに委譲
- Result型でエラーを返す

**実装場所**: `application/command/`

**例**: 企画提出、承認、差戻し

### Query（クエリ）

**責務**: 表示に最適化されたデータを返す

**特徴**:

- 読み取り専用、副作用なし
- 集約の境界を超えてJOIN可能
- DTO（Data Transfer Object）で柔軟な型を返す
- パフォーマンス最適化可能（キャッシュ、インデックス）
- zod schemaでDTOを定義し、型は`z.infer`で派生

**実装場所**: `application/query/`

**例**: イベント一覧、企画詳細、統計データ

### DTO定義規則

Queryでは、ドメインモデルとは別にDTO（Data Transfer Object）を定義します。

**原則**:

- DTOはクエリ関数と同じファイルに定義（`types.ts`は作らない）
- zod schemaで定義し、型は`z.infer`で派生（ドメインモデルと同様）
- 複数テーブルのJOIN結果を表現可能
- 表示に必要なフィールドのみ含む
- 計算済みフィールドを追加可能

**例**:

```typescript
// application/query/event/list-events.ts
import { z } from "zod";

// DTO schema定義
export const eventListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(["active", "archived"]),
  createdAt: z.date(),
  // 集約を超えた集計データ
  projectCount: z.number(),
  organizationCount: z.number(),
});

// 型を派生
export type EventListItem = z.infer<typeof eventListItemSchema>;

// Query関数
export async function listEvents(): Promise<Result<EventListItem[], QueryError>> {
  // ...
}
```

### 使い分け

**Command を使う場合**:

- データを変更する操作（Create, Update, Delete）
- ビジネスルールの検証が必要
- トランザクションが必要
- 集約の不変条件を守る必要がある

**Query を使う場合**:

- データを表示する（Read）
- 複数の集約をまたぐデータが必要
- 統計・集計データが必要
- パフォーマンスを最適化したい

---

## ディレクトリ構造

```
src/
├── application/                  # Application層（CQRS）
│   ├── command/                  # Command側（書き込み）
│   │   ├── project/
│   │   │   ├── submit-project.ts     # 企画提出UC
│   │   │   ├── approve-project.ts    # 企画承認UC
│   │   │   ├── return-project.ts     # 企画差戻しUC
│   │   │   ├── withdraw-project.ts   # 企画取り下げUC
│   │   │   └── edit-draft.ts         # Draft編集UC
│   │   ├── organization/
│   │   │   ├── create-org.ts
│   │   │   ├── update-org.ts
│   │   │   └── manage-members.ts
│   │   ├── event/
│   │   │   ├── create-event.ts
│   │   │   ├── update-event.ts
│   │   │   └── archive-event.ts
│   │   └── admin/
│   │       ├── assign-committee-role.ts
│   │       └── manage-deadlines.ts
│   │
│   └── query/                    # Query側（読み取り）
│       ├── event/
│       │   ├── list-events.ts        # イベント一覧（DTO + Query関数）
│       │   ├── get-event-detail.ts   # イベント詳細（DTO + Query関数）
│       │   └── get-event-stats.ts    # 統計情報
│       ├── project/
│       │   ├── list-projects.ts      # 企画一覧
│       │   ├── get-project-detail.ts # 企画詳細
│       │   └── get-draft.ts          # Draft取得
│       ├── organization/
│       │   ├── list-organizations.ts
│       │   └── get-org-members.ts
│       └── admin/
│           ├── get-submissions.ts
│           └── get-committee-members.ts
│
├── domain/                       # Domain層（純粋関数 + 型）
│   ├── project/
│   │   ├── schema.ts             # Zodスキーマ + 型定義
│   │   ├── logic.ts              # ドメインロジック（純粋関数）
│   │   └── errors.ts             # エラー型定義
│   ├── organization/
│   │   ├── schema.ts
│   │   ├── logic.ts
│   │   └── errors.ts
│   ├── event/
│   │   ├── schema.ts
│   │   ├── logic.ts
│   │   └── errors.ts
│   └── shared/
│       ├── ids.ts                # 共通ID型（Brand型）
│       └── value-objects.ts      # 共通値オブジェクト
│
├── infrastructure/               # Infrastructure層
│   ├── repositories/
│   │   ├── interfaces.ts         # Repository インターフェース定義
│   │   ├── project-repository.ts # Project Repository 実装
│   │   ├── org-repository.ts     # Organization Repository 実装
│   │   └── event-repository.ts   # Event Repository 実装
│   ├── storage/
│   │   └── r2-storage.ts         # R2ストレージクライアント
│   ├── services/
│   │   └── export-service.ts     # CSV/JSON出力サービス
│   └── di.ts                     # DIコンテナ
│
├── routes/                       # TanStack Router（既存）
│   ├── __root.tsx
│   ├── index.tsx
│   ├── _authenticated.ts
│   ├── _public.tsx
│   └── ...
│
├── components/                   # React コンポーネント（既存）
│   ├── features/                 # 機能別コンポーネント
│   │   ├── project/
│   │   │   ├── ProjectDraftEditor.tsx
│   │   │   ├── SubmissionList.tsx
│   │   │   └── PublishedPreview.tsx
│   │   ├── organization/
│   │   └── admin/
│   ├── shared/                   # 共通UIコンポーネント
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── forms/
│   │   │   ├── Input.tsx
│   │   │   ├── Textarea.tsx
│   │   │   └── Select.tsx
│   │   └── feedback/
│   │       ├── Toast.tsx
│   │       ├── Modal.tsx
│   │       └── Alert.tsx
│   └── ui/                       # Park UI コンポーネント
│
├── hooks/                        # カスタムフック
│   ├── use-auth.ts
│   ├── use-permissions.ts
│   └── use-project.ts
│
├── db/                           # データベース（既存）
│   ├── schema.ts                 # Drizzle スキーマ + Zod
│   ├── auth-schema.ts            # Better Auth スキーマ
│   └── index.ts                  # DB クライアント
│
├── libs/                         # 共通ライブラリ（既存）
│   ├── auth.ts                   # Better Auth 設定
│   ├── auth-client.ts            # Auth クライアント
│   ├── session-server.ts         # セッション取得
│   ├── permissions.ts            # 権限チェック関数
│   ├── result.ts                 # Result 型ヘルパー
│   └── id.ts                     # ID生成関数
│
└── theme/                        # Panda CSS（既存）
```

---

## レイヤー設計

### Domain層（ドメイン層）

**責務**: ビジネスルール・不変条件・ドメインロジック

**原則**:

- 純粋関数のみ
- 外部依存なし（I/O禁止）
- Zodスキーマで型定義
- Result型でエラーを返す

**ファイル構成**:

- `schema.ts`: Zodスキーマ定義 + 型派生
- `logic.ts`: ドメインロジック（純粋関数）
- `errors.ts`: エラー型定義

**例**: [domain/project/schema.ts](#domainprojectschemats)

---

### Infrastructure層（インフラ層）

**責務**: 永続化・外部システム連携・I/O操作

**原則**:

- Repository パターンでドメイン層から隔離
- インターフェースを定義し、実装を差し替え可能に
- DIコンテナで依存を管理

**ファイル構成**:

- `repositories/interfaces.ts`: Repository インターフェース
- `repositories/*-repository.ts`: Repository 実装（Drizzle ORM使用）
- `storage/r2-storage.ts`: R2ストレージクライアント
- `di.ts`: DIコンテナ

**例**: [infrastructure/repositories/interfaces.ts](#infrastructurerepositoritiesinterfacests)

---

### Application層（アプリケーション層）

Application層はCQRSパターンに従い、Command（書き込み）とQuery（読み取り）に分離します。

#### Command（書き込み）

**責務**: ビジネスフローの調整・トランザクション管理

**原則**:

- 依存（Repository）をDIで受け取る（引数として渡す）
- Result型を返す
- ドメインロジックに委譲
- `gen` 関数でResultをハンドリング
- 集約の不変条件を守る

**ファイル構成**:

- `application/command/project/submit-project.ts`: 提出ユースケース
- `application/command/project/approve-project.ts`: 承認ユースケース
- など

**例**: [application/command/project/submit-project.ts](#applicationcommandprojectsubmit-projectts)

#### Query（読み取り）

**責務**: 表示に最適化されたデータ取得

**原則**:

- 読み取り専用、副作用なし
- 直接DBにアクセス（Drizzle ORM使用）
- 集約を超えてJOIN可能
- zod schemaでDTOを定義し、型は`z.infer`で派生
- DTOはクエリ関数と同じファイルに定義
- Result型を返す

**ファイル構成**:

- `application/query/event/list-events.ts`: イベント一覧（DTO定義 + Query関数）
- `application/query/project/get-project-detail.ts`: 企画詳細（DTO定義 + Query関数）
- など

**例**: [application/query/event/list-events.ts](#applicationqueryeventlist-eventsts)

---

### Presentation層（プレゼンテーション層）

**責務**: UI表示・ユーザーインタラクション

**原則**:

- 既存の `routes/`, `components/` 構造を維持
- TanStack Query でサーバー状態管理
- React State でローカルUI状態管理

---

## 型システム設計

### Zodスキーマからの型派生

すべての型は Zod スキーマから派生させます。

```typescript
// domain/project/schema.ts
import { z } from "zod";

// Zodスキーマ定義
export const projectSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  // ...
});

// 型派生
export type Project = z.infer<typeof projectSchema>;
```

**利点**:

- ランタイムバリデーションと型が一致
- 単一の真実の源（Single Source of Truth）
- スキーマ変更時に型が自動更新

---

### Brand型によるID管理

文字列IDは Brand型 で管理し、異なる種類のIDを混同しないようにします。

```typescript
// domain/shared/ids.ts
import { z } from "zod";

export const projectIdSchema = z.string().brand<"ProjectId">();
export const eventIdSchema = z.string().brand<"EventId">();
export const orgIdSchema = z.string().brand<"OrgId">();
export const submissionIdSchema = z.string().brand<"SubmissionId">();
export const userIdSchema = z.string().brand<"UserId">();

export type ProjectId = z.infer<typeof projectIdSchema>;
export type EventId = z.infer<typeof eventIdSchema>;
export type OrgId = z.infer<typeof orgIdSchema>;
export type SubmissionId = z.infer<typeof submissionIdSchema>;
export type UserId = z.infer<typeof userIdSchema>;
```

**利点**:

- 型安全性の向上（ProjectId と OrgId を間違えるとコンパイルエラー）
- コードの意図が明確

**使用例**:

```typescript
function submitProject(projectId: ProjectId) { ... }

const projectId: ProjectId = "abc123" as ProjectId
const orgId: OrgId = "def456" as OrgId

submitProject(projectId) // ✅ OK
submitProject(orgId)     // ❌ Type Error!
```

---

## エラーハンドリング戦略

### Result型の使用

例外（`throw`）を使わず、Result型でエラーを返します。

```typescript
import { Result } from "@praha/byethrow";

// ❌ 例外throw
export const canSubmit = (project: Project): void => {
  if (project.activeSubmissionId !== null) {
    throw new Error("Already submitted");
  }
};

// ✅ Result型
export const canSubmit = (project: Project): Result.Result<true, ProjectError> => {
  if (project.activeSubmissionId !== null) {
    return Result.fail(projectError("ALREADY_SUBMITTED", "既に提出済みです"));
  }
  return Result.succeed(true);
};
```

### gen関数によるResultハンドリング

`gen` 関数を使うと、Result型を簡潔に扱えます。

```typescript
import { gen } from '@/libs/result'

export const submitProject = (deps: Dependencies, input: Input) => {
  return gen(async function* ($) {
    // Result を yield* $() でアンラップ
    const project = yield* $(getProject(input.projectId))

    // エラーがあれば自動的に早期リターン
    yield* $(canSubmit(project))

    // 成功時の処理
    const submission = createSubmission(...)
    await deps.projectRepo.saveSubmission(submission)

    return { success: true }
  })
}
```

---

## 実装パターン

### domain/project/schema.ts

```typescript
import { z } from "zod";

// ============================================================================
// Brand型付きID定義
// ============================================================================

export const projectIdSchema = z.string().brand<"ProjectId">();
export const eventIdSchema = z.string().brand<"EventId">();
export const orgIdSchema = z.string().brand<"OrgId">();
export const submissionIdSchema = z.string().brand<"SubmissionId">();
export const userIdSchema = z.string().brand<"UserId">();

export type ProjectId = z.infer<typeof projectIdSchema>;
export type EventId = z.infer<typeof eventIdSchema>;
export type OrgId = z.infer<typeof orgIdSchema>;
export type SubmissionId = z.infer<typeof submissionIdSchema>;
export type UserId = z.infer<typeof userIdSchema>;

// ============================================================================
// ドメインオブジェクトスキーマ
// ============================================================================

export const projectSchema = z.object({
  id: projectIdSchema,
  eventId: eventIdSchema,
  orgId: orgIdSchema,
  name: z.string().min(1),
  placeText: z.string().nullable(),
  logoKey: z.string().nullable(),
  activeSubmissionId: submissionIdSchema.nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const draftSchema = z.object({
  projectId: projectIdSchema,
  pamphletText: z.string().max(120).nullable(),
  webContentJson: z.unknown(), // TipTap JSON
  updatedAt: z.number(),
  updatedBy: userIdSchema,
});

export const submissionSchema = z.object({
  id: submissionIdSchema,
  projectId: projectIdSchema,
  status: z.enum(["submitted", "returned", "approved", "withdrawn"]),
  pamphletText: z.string().max(120).nullable(),
  webContentJson: z.unknown(),
  submittedAt: z.number(),
  submittedBy: userIdSchema,
  decidedAt: z.number().nullable(),
  decidedBy: userIdSchema.nullable(),
});

export const publishedSchema = z.object({
  projectId: projectIdSchema,
  pamphletText: z.string().max(120).nullable(),
  webContentJson: z.unknown(),
  publishedAt: z.number(),
  publishedBy: userIdSchema,
});

// ============================================================================
// 型派生
// ============================================================================

export type Project = z.infer<typeof projectSchema>;
export type Draft = z.infer<typeof draftSchema>;
export type Submission = z.infer<typeof submissionSchema>;
export type Published = z.infer<typeof publishedSchema>;
```

---

### domain/project/errors.ts

```typescript
export type ProjectErrorCode =
  | "ALREADY_SUBMITTED"
  | "INVALID_STATUS"
  | "ALREADY_APPROVED"
  | "NOT_SUBMITTED";

export type ProjectError = {
  code: ProjectErrorCode;
  message: string;
};

export const projectError = (code: ProjectErrorCode, message: string): ProjectError => ({
  code,
  message,
});
```

---

### domain/project/logic.ts

```typescript
import { Result } from "@praha/byethrow";
import type {
  Project,
  Draft,
  Submission,
  Published,
  ProjectId,
  SubmissionId,
  UserId,
} from "./schema";
import type { ProjectError } from "./errors";
import { projectError } from "./errors";

/**
 * 提出可能かチェック（不変条件）
 */
export const canSubmit = (project: Project): Result.Result<true, ProjectError> => {
  if (project.activeSubmissionId !== null) {
    return Result.fail(projectError("ALREADY_SUBMITTED", "既に提出済みです"));
  }
  return Result.succeed(true);
};

/**
 * 承認可能かチェック（不変条件）
 */
export const canApprove = (submission: Submission): Result.Result<true, ProjectError> => {
  if (submission.status !== "submitted") {
    return Result.fail(projectError("INVALID_STATUS", "提出中の企画のみ承認可能です"));
  }
  return Result.succeed(true);
};

/**
 * 取り下げ可能かチェック（不変条件）
 */
export const canWithdraw = (submission: Submission): Result.Result<true, ProjectError> => {
  if (submission.status === "approved") {
    return Result.fail(projectError("ALREADY_APPROVED", "承認済みの企画は取り下げできません"));
  }
  if (submission.status !== "submitted") {
    return Result.fail(projectError("INVALID_STATUS", "提出中の企画のみ取り下げ可能です"));
  }
  return Result.succeed(true);
};

/**
 * Draftから新しいSubmissionを生成（純粋関数）
 */
export const createSubmissionFromDraft = (
  draft: Draft,
  userId: UserId,
  submissionId: SubmissionId,
): Submission => {
  return {
    id: submissionId,
    projectId: draft.projectId,
    status: "submitted",
    pamphletText: draft.pamphletText,
    webContentJson: draft.webContentJson,
    submittedAt: Date.now(),
    submittedBy: userId,
    decidedAt: null,
    decidedBy: null,
  };
};

/**
 * 提出後のProject状態を生成（純粋関数）
 */
export const projectAfterSubmit = (project: Project, submissionId: SubmissionId): Project => {
  return {
    ...project,
    activeSubmissionId: submissionId,
    updatedAt: Date.now(),
  };
};

/**
 * 承認後のSubmissionを生成（純粋関数）
 */
export const approveSubmission = (submission: Submission, userId: UserId): Submission => {
  return {
    ...submission,
    status: "approved",
    decidedAt: Date.now(),
    decidedBy: userId,
  };
};

/**
 * SubmissionからPublishedを生成（純粋関数）
 */
export const createPublishedFromSubmission = (
  submission: Submission,
  userId: UserId,
): Published => {
  return {
    projectId: submission.projectId,
    pamphletText: submission.pamphletText,
    webContentJson: submission.webContentJson,
    publishedAt: Date.now(),
    publishedBy: userId,
  };
};

/**
 * 承認後のProject状態を生成（純粋関数）
 */
export const projectAfterApprove = (project: Project): Project => {
  return {
    ...project,
    activeSubmissionId: null,
    updatedAt: Date.now(),
  };
};
```

---

### application/query/event/list-events.ts

```typescript
import { z } from "zod";
import { Result } from "@praha/byethrow";
import { db } from "@/db";
import { events, projects } from "@/db/schema";
import { desc, eq, count } from "drizzle-orm";

/**
 * Event list item DTO schema
 * イベント一覧表示用のDTOスキーマ
 */
export const eventListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(["active", "archived"]),
  createdAt: z.date(),
  // 集約を超えた集計データ
  projectCount: z.number(),
  organizationCount: z.number(),
});

/**
 * Event list item DTO type (derived from schema)
 */
export type EventListItem = z.infer<typeof eventListItemSchema>;

/**
 * Query error type
 */
export type QueryError = {
  code: "DATABASE_ERROR" | "UNKNOWN_ERROR";
  message: string;
};

/**
 * List all events with aggregated data
 * 集約を超えてJOINし、表示に最適化されたデータを返す
 */
export async function listEvents(): Promise<Result.Result<EventListItem[], QueryError>> {
  try {
    // 複数テーブルをJOINして表示用データを取得
    const rows = await db
      .select({
        id: events.id,
        name: events.name,
        slug: events.slug,
        status: events.status,
        createdAt: events.createdAt,
        // 集約: イベント内の企画数
        projectCount: count(projects.id),
      })
      .from(events)
      .leftJoin(projects, eq(events.id, projects.eventId))
      .groupBy(events.id)
      .orderBy(desc(events.createdAt));

    // zodでバリデーション + 型変換
    const eventList: EventListItem[] = rows.map((row) =>
      eventListItemSchema.parse({
        id: row.id,
        name: row.name,
        slug: row.slug,
        status: row.status,
        createdAt: new Date(row.createdAt),
        projectCount: row.projectCount,
        organizationCount: 0, // TODO: 実装
      }),
    );

    return Result.succeed(eventList);
  } catch (error) {
    console.error("[Query Error] Failed to list events", error);
    return Result.fail({
      code: "DATABASE_ERROR",
      message: "イベント一覧の取得に失敗しました。",
    });
  }
}
```

**特徴**:

- DTOスキーマ（`eventListItemSchema`）をzodで定義
- 型（`EventListItem`）は`z.infer`で派生
- 複数テーブル（`events`, `projects`）をJOINして集計
- 表示に必要なデータのみ返す
- zodで結果をバリデーション

---

### infrastructure/repositories/interfaces.ts

```typescript
import type {
  Project,
  Draft,
  Submission,
  Published,
  ProjectId,
  SubmissionId,
} from "@/domain/project/schema";

export interface ProjectRepository {
  findById(id: ProjectId): Promise<Project | null>;
  findDraftByProjectId(projectId: ProjectId): Promise<Draft | null>;
  findSubmissionById(id: SubmissionId): Promise<Submission | null>;

  save(project: Project): Promise<void>;
  saveDraft(draft: Draft): Promise<void>;
  saveSubmission(submission: Submission): Promise<void>;
  updateSubmission(submission: Submission): Promise<void>;
  savePublished(published: Published): Promise<void>;

  updateProject(project: Project): Promise<void>;
}

export interface OrganizationRepository {
  // TODO: 定義
}

export interface EventRepository {
  // TODO: 定義
}
```

---

### infrastructure/di.ts

```typescript
import type {
  ProjectRepository,
  OrganizationRepository,
  EventRepository,
} from "./repositories/interfaces";
import { DrizzleProjectRepository } from "./repositories/project-repository";

export type Dependencies = {
  projectRepo: ProjectRepository;
  orgRepo: OrganizationRepository;
  eventRepo: EventRepository;
};

/**
 * DIコンテナ（シンプル実装）
 */
export const getDependencies = (): Dependencies => {
  return {
    projectRepo: new DrizzleProjectRepository(),
    // TODO: 他のリポジトリ実装
    orgRepo: null as any,
    eventRepo: null as any,
  };
};
```

---

### application/command/project/submit-project.ts

```typescript
import { Result } from "@praha/byethrow";
import { gen } from "@/libs/result";
import type { Dependencies } from "@/infrastructure/di";
import type { ProjectId, SubmissionId, UserId } from "@/domain/project/schema";
import type { ProjectError } from "@/domain/project/errors";
import { canSubmit, createSubmissionFromDraft, projectAfterSubmit } from "@/domain/project/logic";
import { generateId } from "@/libs/id";

export type SubmitProjectInput = {
  projectId: ProjectId;
  userId: UserId;
};

export type SubmitProjectOutput = {
  submissionId: SubmissionId;
};

export type SubmitProjectError =
  | ProjectError
  | { code: "PROJECT_NOT_FOUND"; message: string }
  | { code: "DRAFT_NOT_FOUND"; message: string };

/**
 * 企画提出ユースケース
 */
export const submitProject = (
  deps: Dependencies,
  input: SubmitProjectInput,
): Result.ResultAsync<SubmitProjectOutput, SubmitProjectError> => {
  return gen(async function* ($) {
    const { projectRepo } = deps;
    const { projectId, userId } = input;

    // 1. プロジェクトを取得
    const project = await projectRepo.findById(projectId);
    if (!project) {
      return yield* $(
        Result.fail({
          code: "PROJECT_NOT_FOUND" as const,
          message: "プロジェクトが見つかりません",
        }),
      );
    }

    // 2. Draftを取得
    const draft = await projectRepo.findDraftByProjectId(projectId);
    if (!draft) {
      return yield* $(
        Result.fail({
          code: "DRAFT_NOT_FOUND" as const,
          message: "Draft が見つかりません",
        }),
      );
    }

    // 3. 不変条件チェック（ドメインロジック）
    yield* $(canSubmit(project));

    // 4. ドメインロジック実行（純粋関数）
    const submissionId = generateId() as SubmissionId;
    const submission = createSubmissionFromDraft(draft, userId, submissionId);
    const updatedProject = projectAfterSubmit(project, submissionId);

    // 5. 永続化
    await projectRepo.saveSubmission(submission);
    await projectRepo.updateProject(updatedProject);

    return { submissionId: submission.id };
  });
};
```

---

## データフロー

### Command（書き込み）フロー

Draft → Submission → Published のライフサイクル

```
┌─────────────────────────────────────────────────────┐
│  1. Draft編集 (Organization Member)                 │
│     ↓ routes/action                                 │
│     └→ editDraftCommand (application/command/)      │
│         ├─ Domain logic check                       │
│         └→ ProjectRepository.saveDraft()            │
└─────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────┐
│  2. 提出 (Organization Manager)                     │
│     ↓ routes/action                                 │
│     └→ submitProjectCommand (application/command/)  │
│         ├─ canSubmit(project)  ← ドメイン不変条件   │
│         ├─ createSubmissionFromDraft()              │
│         ├─ projectAfterSubmit()                     │
│         └→ ProjectRepository.saveSubmission()       │
└─────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────┐
│  3. 承認 (Approver/Admin)                           │
│     ↓ routes/action                                 │
│     └→ approveProjectCommand (application/command/) │
│         ├─ canApprove(submission)  ← ドメイン不変条件│
│         ├─ approveSubmission()                      │
│         ├─ createPublishedFromSubmission()          │
│         ├─ projectAfterApprove()                    │
│         └→ ProjectRepository.savePublished()        │
└─────────────────────────────────────────────────────┘
```

### Query（読み取り）フロー

表示に最適化されたデータ取得

```
┌─────────────────────────────────────────────────────┐
│  イベント一覧表示                                   │
│     ↓ routes/loader                                 │
│     └→ listEventsQuery (application/query/)         │
│         ├─ 直接DB（Drizzle ORM）                    │
│         ├─ JOIN: events + projects (集計)           │
│         ├─ DTO: EventListItem (zod schema)          │
│         └→ 表示用データ返却                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  企画詳細表示                                       │
│     ↓ routes/loader                                 │
│     └→ getProjectDetailQuery (application/query/)   │
│         ├─ 直接DB（Drizzle ORM）                    │
│         ├─ JOIN: project + draft + published        │
│         │        + tags + organization               │
│         ├─ DTO: ProjectDetailDTO (zod schema)       │
│         └→ 表示用データ返却                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  統計情報表示                                       │
│     ↓ routes/loader                                 │
│     └→ getEventStatsQuery (application/query/)      │
│         ├─ 直接DB（Drizzle ORM）                    │
│         ├─ 集計: COUNT, GROUP BY                    │
│         ├─ DTO: EventStatsDTO (zod schema)          │
│         └→ 統計データ返却                            │
└─────────────────────────────────────────────────────┘
```

### CQRS データフロー全体像

```
┌─────────────────────────────────────────────────────┐
│                    Presentation                     │
│  ┌────────────────┐         ┌────────────────┐     │
│  │  routes/loader │         │ routes/action  │     │
│  │  (読み取り)    │         │  (書き込み)    │     │
│  └────────────────┘         └────────────────┘     │
└─────────────────────────────────────────────────────┘
         │                              │
         │ Query                        │ Command
         ▼                              ▼
┌──────────────────┐         ┌──────────────────┐
│ application/     │         │ application/     │
│   query/         │         │   command/       │
│                  │         │                  │
│ - DTO定義(zod)   │         │ - Use Cases      │
│ - 直接DB         │         │ - Repository経由 │
│ - JOIN可能       │         │ - Domain logic   │
└──────────────────┘         └──────────────────┘
         │                              │
         │                              ▼
         │                    ┌──────────────────┐
         │                    │     Domain       │
         │                    │   - logic.ts     │
         │                    │   - schema.ts    │
         │                    └──────────────────┘
         │                              │
         └──────────┬───────────────────┘
                    ▼
         ┌─────────────────────┐
         │   Infrastructure    │
         │  - repositories/    │
         │  - DB (Drizzle)     │
         └─────────────────────┘
                    │
                    ▼
              ┌─────────┐
              │    D1   │
              └─────────┘
```

---

## 権限管理

### 二層権限管理アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│          Layer 1: System Admin (Better Auth)        │
│  - イベント作成・削除                                │
│  - システム全体設定                                  │
│  - グローバルユーザー管理                            │
└─────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────┐
│      Layer 2: Event Committee (committee_roles)     │
│  ┌──────────┬──────────┬──────────┬──────────┐    │
│  │  admin   │ approver │  member  │ default  │    │
│  ├──────────┼──────────┼──────────┼──────────┤    │
│  │ イベント │ 企画承認 │ 全企画   │ 自団体   │    │
│  │ 設定変更 │ 差戻し   │ 閲覧     │ 編集のみ │    │
│  └──────────┴──────────┴──────────┴──────────┘    │
└─────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────┐
│      Layer 3: Organization Roles (org_members)      │
│  ┌──────────────────┬────────────────────────────┐ │
│  │    manager       │         editor              │ │
│  ├──────────────────┼────────────────────────────┤ │
│  │ 提出・メンバー管理│ 編集のみ                   │ │
│  └──────────────────┴────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

詳細は [docs/design/admin.md](./design/admin.md) を参照。

---

## テスト戦略

### 1. ドメインロジックのテスト

純粋関数なので、テストが簡単です。

```typescript
// domain/project/logic.test.ts
import { describe, it, expect } from 'vitest'
import { canSubmit } from './logic'
import { Result } from '@praha/byethrow'

describe('canSubmit', () => {
  it('activeSubmissionId が null の場合、提出可能', () => {
    const project = { activeSubmissionId: null, ... }
    const result = canSubmit(project)

    expect(Result.isSuccess(result)).toBe(true)
  })

  it('activeSubmissionId がある場合、提出不可', () => {
    const project = { activeSubmissionId: 'sub_123', ... }
    const result = canSubmit(project)

    expect(Result.isFailure(result)).toBe(true)
    expect(result.error.code).toBe('ALREADY_SUBMITTED')
  })
})
```

### 2. Command（Use Case）のテスト

依存をモックして注入します。

```typescript
// application/command/project/submit-project.test.ts
import { describe, it, expect, vi } from 'vitest'
import { submitProject } from './submit-project'
import { Result } from '@praha/byethrow'

describe('submitProject', () => {
  it('正常系: 提出成功', async () => {
    // モックリポジトリ
    const mockRepo = {
      findById: vi.fn().mockResolvedValue({ activeSubmissionId: null, ... }),
      findDraftByProjectId: vi.fn().mockResolvedValue({ ... }),
      saveSubmission: vi.fn(),
      updateProject: vi.fn(),
    }

    const deps = { projectRepo: mockRepo }
    const input = { projectId: 'proj_123', userId: 'user_456' }

    const result = await submitProject(deps, input)

    expect(Result.isSuccess(result)).toBe(true)
    expect(mockRepo.saveSubmission).toHaveBeenCalled()
  })

  it('異常系: プロジェクトが見つからない', async () => {
    const mockRepo = {
      findById: vi.fn().mockResolvedValue(null),
    }

    const deps = { projectRepo: mockRepo }
    const input = { projectId: 'proj_123', userId: 'user_456' }

    const result = await submitProject(deps, input)

    expect(Result.isFailure(result)).toBe(true)
    expect(result.error.code).toBe('PROJECT_NOT_FOUND')
  })
})
```

### 3. Query のテスト

DBをモックしてテストします。

```typescript
// application/query/event/list-events.test.ts
import { describe, it, expect, vi } from "vitest";
import { listEvents } from "./list-events";
import { Result } from "@praha/byethrow";

// DBモックを作成
vi.mock("@/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([
      {
        id: "evt_1",
        name: "学園祭2025",
        slug: "2025",
        status: "active",
        createdAt: "2025-01-01",
        projectCount: 10,
      },
    ]),
  },
}));

describe("listEvents", () => {
  it("正常系: イベント一覧取得成功", async () => {
    const result = await listEvents();

    expect(Result.isSuccess(result)).toBe(true);
    expect(result.value).toHaveLength(1);
    expect(result.value[0].name).toBe("学園祭2025");
    expect(result.value[0].projectCount).toBe(10);
  });
});
```

---

## 参考資料

### 内部ドキュメント

- [要件定義書](./requirements.md)
- [基本設計書](./design.md)
- [管理者権限設計書](./design/admin.md)
- [タスクリスト](./tasks.md)
- [CLAUDE.md](../CLAUDE.md)

### データベース

- [スキーマ定義](../src/db/schema.ts)
- [認証スキーマ](../src/db/auth-schema.ts)

### 技術リファレンス

- [TanStack Start](https://tanstack.com/start)
- [TanStack Router](https://tanstack.com/router)
- [TanStack Query](https://tanstack.com/query)
- [Better Auth](https://better-auth.com)
- [Drizzle ORM](https://orm.drizzle.team)
- [Panda CSS](https://panda-css.com)
- [Park UI](https://park-ui.com)
- [Zod](https://zod.dev)
- [@praha/byethrow (Result型)](https://github.com/m-shaka/byethrow)

---

## 改訂履歴

| バージョン | 日付       | 変更内容                              |
| ---------- | ---------- | ------------------------------------- |
| 1.1.0      | 2026-02-23 | CQRSパターン導入（Command/Query分離） |
| 1.0.0      | 2026-02-23 | 初版作成（アーキテクチャ確定）        |
