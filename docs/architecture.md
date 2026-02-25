# アーキテクチャ設計書

**プロジェクト**: 大学祭企画情報管理システム
**最終更新**: 2026-02-24
**バージョン**: 1.3.0

---

## 目次

1. [概要](#概要)
2. [アーキテクチャ原則](#アーキテクチャ原則)
3. [全体構成](#全体構成)
4. [CQRS パターン](#cqrs-パターン)
5. [ディレクトリ構造](#ディレクトリ構造)
6. [レイヤー設計](#レイヤー設計)
7. [ドメインサービス](#ドメインサービス)
8. [型システム設計](#型システム設計)
9. [エラーハンドリング戦略](#エラーハンドリング戦略)
10. [実装パターン](#実装パターン)
11. [TanStack Query統合](#tanstack-query統合)
12. [データフロー](#データフロー)
13. [権限管理](#権限管理)
14. [テスト戦略](#テスト戦略)
15. [参考資料](#参考資料)

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
         │ (Drizzle)                 │ Domain Service
         │                           ▼
         │                  ┌──────────────────┐
         │                  │  Domain Layer    │
         │                  │  domain/         │
         │                  │  - schema.ts     │
         │                  │  - logic.ts      │
         │                  │  - service.ts    │
         │                  │  - errors.ts     │
         │                  └──────────────────┘
         │                           │
         └───────────┬───────────────┘
                     ▼
         ┌─────────────────────────┐
         │  Infrastructure Layer   │
         │  infrastructure/        │
         │  - repositories/        │
         │  - domain-services/     │
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
├── domain/                       # Domain層（純粋関数 + 型 + サービスIF）
│   ├── project/
│   │   ├── schema.ts             # Zodスキーマ + 型定義
│   │   ├── logic.ts              # ドメインロジック（純粋関数）
│   │   ├── errors.ts             # エラー型定義
│   │   └── repository.ts         # Repository インターフェース定義
│   ├── organization/
│   │   ├── schema.ts
│   │   ├── logic.ts
│   │   ├── errors.ts
│   │   └── repository.ts
│   ├── event/
│   │   ├── schema.ts
│   │   ├── logic.ts
│   │   ├── service.ts            # ドメインサービスインターフェース
│   │   ├── errors.ts
│   │   └── repository.ts
│   ├── user/
│   │   ├── schema.ts
│   │   ├── logic.ts
│   │   ├── errors.ts
│   │   └── repository.ts
│   ├── authorization/
│   │   ├── schema.ts
│   │   ├── logic.ts
│   │   ├── errors.ts
│   │   └── service.ts            # Authorization サービスインターフェース
│   └── shared/
│       ├── ids.ts                # 共通ID型（Brand型）
│       ├── errors.ts             # 共通エラー型
│       ├── repository.ts         # 共通Repository型
│       └── storage.ts            # Storage サービスインターフェース
│
├── infrastructure/               # Infrastructure層
│   ├── repositories/
│   │   ├── project-repository.ts # Project Repository 実装
│   │   ├── event-repository.ts   # Event Repository 実装
│   │   └── user-repository.ts    # User Repository 実装
│   ├── domain-services/
│   │   └── event-domain-service.ts # Event ドメインサービス実装
│   ├── authorization/
│   │   └── authorization-service-impl.ts # Authorization サービス実装
│   ├── storage/
│   │   └── storage-service.ts    # Storage サービス実装（R2）
│   └── di.ts                     # DIコンテナ
│
├── routes/                       # TanStack Router（既存）
│   ├── __root.tsx
│   ├── index.tsx
│   ├── _authenticated.ts
│   ├── _public.tsx
│   └── ...
│
├── features/                     # 機能別モジュール
│   ├── project/
│   │   └── components/
│   │       ├── ProjectDraftEditor.tsx
│   │       ├── SubmissionList.tsx
│   │       └── PublishedPreview.tsx
│   ├── organization/
│   │   └── components/
│   └── admin/
│       └── components/
│
├── components/                   # 共通コンポーネント（既存）
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

- `logic.ts`: 純粋関数のみ（I/O禁止）
- `service.ts`: ドメインサービスの**インターフェース定義**のみ（実装はインフラ層）
- Zodスキーマで型定義
- Result型でエラーを返す

**ファイル構成**:

- `schema.ts`: Zodスキーマ定義 + 型派生
- `logic.ts`: ドメインロジック（純粋関数、I/O不要なビジネスルール）
- `service.ts`: ドメインサービスインターフェース（I/Oが必要なビジネスルール）
- `errors.ts`: エラー型定義
- `repository.ts`: Repository インターフェース定義（各集約ごと）

**例**: [domain/project/schema.ts](#domainprojectschemats)

---

### Infrastructure層（インフラ層）

**責務**: 永続化・外部システム連携・I/O操作

**原則**:

- Repository パターンでドメイン層から隔離
- インターフェースはドメイン層で定義、実装はインフラ層で提供
- DIコンテナで依存を管理

**ファイル構成**:

- `repositories/*-repository.ts`: Repository 実装（Drizzle ORM使用）
- `domain-services/*-domain-service.ts`: ドメインサービス実装（Repositoryを使用）
- `authorization/authorization-service-impl.ts`: 認可サービス実装
- `storage/storage-service.ts`: ストレージサービス実装（R2）
- `di.ts`: DIコンテナ

**例**: [infrastructure/repositories/event-repository.ts](#infrastructurerepositoritiesevent-repositoryts)

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

## ドメインサービス

### logic.ts とドメインサービスの違い

ドメイン層には2種類のビジネスロジックがあります。

| 側面         | `logic.ts`（純粋関数）             | `service.ts`（ドメインサービス）       |
| ------------ | ---------------------------------- | -------------------------------------- |
| **I/O**      | なし（純粋関数）                   | あり（Repository経由）                 |
| **定義場所** | ドメイン層で実装まで完結           | ドメイン層にIF、インフラ層に実装       |
| **テスト**   | モック不要                         | Repository をモックして注入            |
| **用途**     | 単一エンティティの不変条件チェック | 集約を超えた一意性検証、整合性チェック |
| **例**       | `canSubmit(project)`               | `ensureSlugUnique(slug)`               |

**判断基準**: ビジネスルールの検証にI/O（DB問い合わせ等）が必要かどうか。

- I/O不要 → `logic.ts` に純粋関数として実装
- I/O必要 → `service.ts` にインターフェース定義、インフラ層で実装

### 設計原則

1. **インターフェースはドメイン層で定義**（依存性逆転の原則）
2. **実装はインフラ層で提供**（Repository等を使用）
3. **DIコンテナで注入**（AuthorizationService と同じパターン）
4. **Result型でエラーを返す**（他のドメインロジックと統一）
5. **ドメインエラーを返す**（RepositoryError ではなく EventError 等）

### ドメイン層: インターフェース定義

```typescript
// domain/event/service.ts
import type { Result } from "@praha/byethrow";
import type { EventError } from "./errors";

/**
 * Event Domain Service Interface
 * I/Oが必要なビジネスルールを定義する
 * 実装はインフラ層で提供（EventDomainServiceImpl）
 */
export interface EventDomainService {
  /** スラッグの一意性を保証する */
  ensureSlugUnique(slug: string): Promise<Result.Result<true, EventError>>;
}
```

### インフラ層: 実装

```typescript
// infrastructure/domain-services/event-domain-service.ts
import type { EventDomainService } from "@/domain/event/service";
import type { EventRepository } from "@/domain/event/repository";
import { Result } from "@praha/byethrow";
import { EVENT_ERROR_CODE, eventError } from "@/domain/event/errors";

export class EventDomainServiceImpl implements EventDomainService {
  constructor(private readonly eventRepo: EventRepository) {}

  async ensureSlugUnique(slug: string): Promise<Result.Result<true, EventError>> {
    const result = await this.eventRepo.findBySlug(slug);
    if (Result.isFailure(result)) {
      return Result.fail(
        eventError(EVENT_ERROR_CODE.SLUG_NOT_UNIQUE, "スラッグの一意性確認に失敗しました"),
      );
    }

    if (result.value !== null) {
      return Result.fail(
        eventError(EVENT_ERROR_CODE.SLUG_NOT_UNIQUE, "このスラッグは既に使用されています"),
      );
    }

    return Result.succeed(true);
  }
}
```

### DI への登録

```typescript
// infrastructure/di.ts
import type { EventDomainService } from "@/domain/event/service";
import { EventDomainServiceImpl } from "./domain-services/event-domain-service";

export type Dependencies = {
  // Repositories
  projectRepo: ProjectRepository;
  eventRepo: EventRepository;
  userRepo: UserRepository;
  // Domain Services
  eventDomainService: EventDomainService;
  // Application Services
  authService: AuthorizationService;
  storageService: StorageService;
};

export function createDependencies(): Dependencies {
  const eventRepo = new EventRepositoryImpl();
  return {
    // ...
    eventRepo,
    eventDomainService: new EventDomainServiceImpl(eventRepo),
    // ...
  };
}
```

### Command での使用

```typescript
// application/command/event/create-event.ts
export async function createEvent(
  deps: Pick<Dependencies, "eventRepo" | "authService" | "eventDomainService">,
  input: CreateEventInput,
): Result.ResultAsync<CreateEventOutput, CreateEventError> {
  return gen(async function* ($) {
    yield* $(deps.authService.enforce(input.actor, placeholderResource, "event:create"));

    const eventId = generateId<EventId>();

    // ドメインサービスに委譲（I/Oが必要なビジネスルール）
    yield* $(await deps.eventDomainService.ensureSlugUnique(input.slug));

    // 純粋なドメインロジック（I/O不要）
    const event = createEventEntity({ id: eventId, name: input.name, slug: input.slug });

    yield* $(await deps.eventRepo.saveEvent(event));
    return { eventId };
  });
}
```

### ドメインサービスを使うべきケース

| ケース                            | 例                                     |
| --------------------------------- | -------------------------------------- |
| **一意性制約**                    | スラッグ、メールアドレスの重複チェック |
| **存在チェック + ビジネスルール** | 参照先の存在確認と整合性検証           |
| **集約をまたぐ整合性チェック**    | 他集約のデータに依存するバリデーション |

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
  pamphletText: z.string().max(120),
  webContentJson: z.unknown(), // TipTap JSON
  updatedAt: z.number(),
  updatedBy: userIdSchema,
});

export const submissionSchema = z.object({
  id: submissionIdSchema,
  projectId: projectIdSchema,
  status: z.enum(["submitted", "returned", "approved", "withdrawn"]),
  pamphletText: z.string().max(120),
  webContentJson: z.unknown(),
  submittedAt: z.number(),
  submittedBy: userIdSchema,
  decidedAt: z.number().nullable(),
  decidedBy: userIdSchema.nullable(),
});

export const publishedSchema = z.object({
  projectId: projectIdSchema,
  pamphletText: z.string().max(120),
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
import type { BaseError } from "../shared/errors";
import { createError } from "../shared/errors";

/**
 * Project Error Codes
 * const objectとして定義し、keyofでUnion型を生成
 */
export const PROJECT_ERROR_CODE = {
  ALREADY_SUBMITTED: "ALREADY_SUBMITTED",
  NOT_SUBMITTED: "NOT_SUBMITTED",
  INVALID_STATUS: "INVALID_STATUS",
  CANNOT_WITHDRAW: "CANNOT_WITHDRAW",
  CANNOT_APPROVE: "CANNOT_APPROVE",
  CANNOT_RETURN: "CANNOT_RETURN",
  PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND",
  DRAFT_NOT_FOUND: "DRAFT_NOT_FOUND",
  SUBMISSION_NOT_FOUND: "SUBMISSION_NOT_FOUND",
  FIELD_NOT_EDITABLE: "FIELD_NOT_EDITABLE",
} as const;

/**
 * Project Error Code Type
 * const objectからUnion型を生成
 */
export type ProjectErrorCode = (typeof PROJECT_ERROR_CODE)[keyof typeof PROJECT_ERROR_CODE];

/**
 * Project Error Type
 * BaseError型を使用してcode + messageの構造を持つ
 */
export type ProjectError = BaseError<ProjectErrorCode>;

/**
 * Project Error Factory
 * エラーオブジェクトを生成するヘルパー関数
 */
export function projectError(code: ProjectErrorCode, message: string): ProjectError {
  return createError(code, message);
}
```

**特徴**:

- `const object + as const`でエラーコードを定義（型安全かつ補完が効く）
- `keyof typeof`でUnion型を生成
- `BaseError<T>`型を使用して共通のエラー構造を持つ
- `createError()`ヘルパーで一貫したエラーオブジェクト生成

---

### domain/shared/errors.ts

```typescript
/**
 * Base error utilities for domain layer
 * すべてのドメインエラーの基底となる型
 */
export type BaseError<TCode extends string = string> = {
  code: TCode;
  message: string;
};

/**
 * Create error helper
 * エラーオブジェクトを生成するヘルパー関数
 */
export function createError<TCode extends string>(code: TCode, message: string): BaseError<TCode> {
  return { code, message };
}
```

**特徴**:

- ジェネリック型`BaseError<TCode>`で様々なエラーコードに対応
- `createError()`で統一されたエラーオブジェクト生成
- すべてのドメインエラーがこの構造を継承

---

### domain/project/logic.ts

```typescript
import { Result } from "@praha/byethrow";
import type {
  Project,
  DraftWithTags,
  ProjectSubmission,
  PublishedWithTags,
  SubmissionWithTags,
} from "./schema";
import type { ProjectError } from "./errors";
import { projectError } from "./errors";
import type { SubmissionId, UserId } from "../shared/ids";

/**
 * =============================================================================
 * Invariant Checks (Business Rules)
 * =============================================================================
 */

/**
 * 提出可能かチェック（不変条件）
 * Rule: Only one active submission allowed at a time
 */
export function canSubmit(project: Project): Result.Result<true, ProjectError> {
  if (project.activeSubmissionId !== null) {
    return Result.fail(
      projectError(
        "ALREADY_SUBMITTED",
        "既に提出済みです。提出中の企画を取り下げてから再提出してください。",
      ),
    );
  }
  return Result.succeed(true);
}

/**
 * 承認可能かチェック（不変条件）
 * Rule: Only "submitted" status can be approved
 */
export function canApprove(submission: ProjectSubmission): Result.Result<true, ProjectError> {
  if (submission.status !== "submitted") {
    return Result.fail(
      projectError(
        "CANNOT_APPROVE",
        `提出中ではない企画は承認できません。現在のステータス: ${submission.status}`,
      ),
    );
  }
  return Result.succeed(true);
}

/**
 * 差戻し可能かチェック（不変条件）
 * Rule: Only "submitted" status can be returned
 */
export function canReturn(submission: ProjectSubmission): Result.Result<true, ProjectError> {
  if (submission.status !== "submitted") {
    return Result.fail(
      projectError(
        "CANNOT_RETURN",
        `提出中ではない企画は差戻しできません。現在のステータス: ${submission.status}`,
      ),
    );
  }
  return Result.succeed(true);
}

/**
 * 取り下げ可能かチェック（不変条件）
 * Rule: Only "submitted" status can be withdrawn (not after approval)
 */
export function canWithdraw(submission: ProjectSubmission): Result.Result<true, ProjectError> {
  if (submission.status !== "submitted") {
    return Result.fail(
      projectError(
        "CANNOT_WITHDRAW",
        `提出中の企画のみ取り下げできます。現在のステータス: ${submission.status}`,
      ),
    );
  }
  return Result.succeed(true);
}

/**
 * =============================================================================
 * Entity Creation (Pure Functions)
 * =============================================================================
 */

/**
 * Draftから新しいSubmissionを生成（純粋関数）
 */
export function createSubmissionFromDraft(
  draft: DraftWithTags,
  userId: UserId,
  submissionId: SubmissionId,
): SubmissionWithTags {
  return {
    id: submissionId,
    projectId: draft.projectId,
    status: "submitted",
    pamphletText: draft.pamphletText,
    webContentJson: draft.webContentJson,
    tags: draft.tags,
    submittedAt: new Date(),
    submittedBy: userId,
    decidedAt: null,
    decidedBy: null,
  };
}

/**
 * 提出後のProject状態を生成（純粋関数）
 */
export function projectAfterSubmit(project: Project, submissionId: SubmissionId): Project {
  return {
    ...project,
    activeSubmissionId: submissionId,
    updatedAt: new Date(),
  };
}

/**
 * 承認後のSubmissionを生成（純粋関数）
 */
export function approveSubmission(
  submission: SubmissionWithTags,
  userId: UserId,
): SubmissionWithTags {
  return {
    ...submission,
    status: "approved",
    decidedAt: new Date(),
    decidedBy: userId,
  };
}

/**
 * SubmissionからPublishedを生成（純粋関数）
 */
export function createPublishedFromSubmission(
  submission: SubmissionWithTags,
  userId: UserId,
): PublishedWithTags {
  return {
    projectId: submission.projectId,
    pamphletText: submission.pamphletText,
    webContentJson: submission.webContentJson,
    tags: submission.tags,
    publishedAt: new Date(),
    publishedBy: userId,
  };
}

/**
 * 承認後のProject状態を生成（純粋関数）
 */
export function projectAfterApprove(project: Project): Project {
  return {
    ...project,
    activeSubmissionId: null,
    updatedAt: new Date(),
  };
}
```

**特徴**:

- function宣言を使用（arrow functionではなく）
- 型名を実装に合わせて更新（`ProjectSubmission`, `DraftWithTags`など）
- エラーコードを実装に合わせて更新（`CANNOT_APPROVE`, `CANNOT_WITHDRAW`など）
- タイムスタンプは`new Date()`を使用（`Date.now()`ではなく）
- `canReturn()`関数を追加

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

### domain/event/repository.ts

```typescript
import type { Result } from "@praha/byethrow";
import type { Event, Tag, Place, Deadline } from "./schema";
import type { EventId, TagId, PlaceId, DeadlineId } from "@/domain/shared/ids";
import type { RepositoryError } from "@/domain/shared/repository";

/**
 * Event Repository Interface
 * Repositoryインターフェースはドメイン層で定義し、実装はインフラ層で提供する
 */
export interface EventRepository {
  findById(id: EventId): Promise<Result.Result<Event | null, RepositoryError>>;
  findBySlug(slug: string): Promise<Result.Result<Event | null, RepositoryError>>;
  listAll(): Promise<Result.Result<Event[], RepositoryError>>;

  findTags(eventId: EventId): Promise<Result.Result<Tag[], RepositoryError>>;
  findPlaces(eventId: EventId): Promise<Result.Result<Place[], RepositoryError>>;
  findDeadlines(eventId: EventId): Promise<Result.Result<Deadline[], RepositoryError>>;

  saveEvent(event: Event): Promise<Result.Result<void, RepositoryError>>;
  saveTag(tag: Tag): Promise<Result.Result<void, RepositoryError>>;
  updateTag(tag: Tag): Promise<Result.Result<void, RepositoryError>>;
  deleteTag(tagId: TagId): Promise<Result.Result<void, RepositoryError>>;
  savePlace(place: Place): Promise<Result.Result<void, RepositoryError>>;
  updatePlace(place: Place): Promise<Result.Result<void, RepositoryError>>;
  deletePlace(placeId: PlaceId): Promise<Result.Result<void, RepositoryError>>;
  saveDeadline(deadline: Deadline): Promise<Result.Result<void, RepositoryError>>;
  deleteDeadline(deadlineId: DeadlineId): Promise<Result.Result<void, RepositoryError>>;
}
```

**特徴**:

- Repositoryインターフェースはドメイン層で定義（依存性逆転の原則）
- Result型でエラーハンドリング
- Brand型IDで型安全性を確保

---

### domain/event/service.ts

```typescript
import type { Result } from "@praha/byethrow";
import type { EventError } from "./errors";

/**
 * Event Domain Service Interface
 * I/Oが必要なビジネスルールを定義する
 * 実装はインフラ層で提供（EventDomainServiceImpl）
 */
export interface EventDomainService {
  /** スラッグの一意性を保証する */
  ensureSlugUnique(slug: string): Promise<Result.Result<true, EventError>>;
}
```

**特徴**:

- ドメイン層ではインターフェースのみ定義（実装はインフラ層）
- メソッドのシグネチャはドメインの言葉で表現（`ensureSlugUnique`）
- 戻り値はドメインエラー（`EventError`）であり、インフラエラー（`RepositoryError`）ではない

---

### infrastructure/domain-services/event-domain-service.ts

```typescript
import type { EventDomainService } from "@/domain/event/service";
import type { EventRepository } from "@/domain/event/repository";
import { Result } from "@praha/byethrow";
import { EVENT_ERROR_CODE, eventError } from "@/domain/event/errors";

/**
 * Event Domain Service Implementation
 * Repositoryを使用してI/Oが必要なビジネスルールを実装する
 */
export class EventDomainServiceImpl implements EventDomainService {
  constructor(private readonly eventRepo: EventRepository) {}

  async ensureSlugUnique(slug: string): Promise<Result.Result<true, EventError>> {
    const result = await this.eventRepo.findBySlug(slug);
    if (Result.isFailure(result)) {
      return Result.fail(
        eventError(EVENT_ERROR_CODE.SLUG_NOT_UNIQUE, "スラッグの一意性確認に失敗しました"),
      );
    }

    if (result.value !== null) {
      return Result.fail(
        eventError(EVENT_ERROR_CODE.SLUG_NOT_UNIQUE, "このスラッグは既に使用されています"),
      );
    }

    return Result.succeed(true);
  }
}
```

**特徴**:

- コンストラクタでRepositoryを受け取る（DIで注入）
- RepositoryError をドメインエラー（EventError）に変換して返す
- ビジネスルールの判定ロジック（存在チェック → エラー）を実装に含む

---

### infrastructure/di.ts

```typescript
import type { ProjectRepository } from "@/domain/project/repository";
import type { EventRepository } from "@/domain/event/repository";
import type { UserRepository } from "@/domain/user/repository";
import type { AuthorizationService } from "@/domain/authorization/service";
import type { StorageService } from "@/domain/shared/storage";
import { EventRepositoryImpl } from "./repositories/event-repository";
import { ProjectRepositoryImpl } from "./repositories/project-repository";
import { UserRepositoryImpl } from "./repositories/user-repository";
import { AuthorizationServiceImpl } from "./authorization/authorization-service-impl";
import { StorageServiceImpl } from "./storage/storage-service";

/**
 * Dependencies container for use cases
 * Provides repository instances and services to application layer
 */
export type Dependencies = {
  projectRepo: ProjectRepository;
  eventRepo: EventRepository;
  userRepo: UserRepository;
  authService: AuthorizationService;
  storageService: StorageService;
};

/**
 * Create dependencies container
 * In the future, this could be extended to support different implementations
 * (e.g., mock repositories for testing)
 */
export function createDependencies(): Dependencies {
  return {
    projectRepo: new ProjectRepositoryImpl(),
    eventRepo: new EventRepositoryImpl(),
    userRepo: new UserRepositoryImpl(),
    authService: new AuthorizationServiceImpl(),
    storageService: new StorageServiceImpl(),
  };
}

/**
 * Global dependencies instance
 * Use this in server-side code (loaders, actions, API routes)
 */
export const dependencies = createDependencies();
```

**特徴**:

- Repositoryインターフェースをドメイン層からインポート
- `createDependencies()`でインスタンス生成
- グローバルインスタンス`dependencies`をエクスポート
- 認可サービス、ストレージサービスも含む

---

### application/command/project/submit-project.ts

```typescript
import { Result } from "@praha/byethrow";
import { gen, suspend } from "@/libs/result";
import { generateId } from "@/libs/id";
import type { ProjectId, SubmissionId, UserId } from "@/domain/shared/ids";
import type { ProjectError } from "@/domain/project/errors";
import type { RepositoryError } from "@/domain/shared/repository";
import { canSubmit, createSubmissionFromDraft, projectAfterSubmit } from "@/domain/project/logic";
import type { Dependencies } from "@/infrastructure/di";

export type SubmitProjectInput = {
  projectId: ProjectId;
  userId: UserId;
};

export type SubmitProjectOutput = {
  submissionId: SubmissionId;
};

export type SubmitProjectError = ProjectError | RepositoryError;

/**
 * 企画提出ユースケース
 */
export function submitProject(
  deps: Pick<Dependencies, "projectRepo">,
  input: SubmitProjectInput,
): Result.ResultAsync<SubmitProjectOutput, SubmitProjectError> {
  return gen(async function* ($) {
      // 1. プロジェクトを取得（RepositoryがResult型を返す）
      const projectResult = yield* $(await deps.projectRepo.findById(input.projectId));

      if (!projectResult) {
        return yield* $(
          Result.fail({
            code: "PROJECT_NOT_FOUND" as const,
            message: "企画が見つかりません。",
          }),
        );
      }

      // 2. Draftを取得
      const draftResult = yield* $(await deps.projectRepo.findDraftWithTags(input.projectId));

      if (!draftResult) {
        return yield* $(
          Result.fail({
            code: "DRAFT_NOT_FOUND" as const,
            message: "下書きが見つかりません。",
          }),
        );
      }

      // 3. 不変条件チェック（ドメインロジック - 純粋関数）
      yield* $(canSubmit(projectResult));

      // 4. ドメインロジック実行（純粋関数）
      const submissionId = generateId<SubmissionId>();
      const submission = createSubmissionFromDraft(draftResult, input.userId, submissionId);
      const updatedProject = projectAfterSubmit(projectResult, submissionId);

      // 5. 永続化
      yield* $(await deps.projectRepo.saveSubmission(submission));
      yield* $(await deps.projectRepo.saveProject(updatedProject, draftResult));

      return { submissionId };
    }),
}
```

**特徴**:

- RepositoryがResult型を返すので、`yield* $(await ...)`でハンドリング
- エラー型に`RepositoryError`を含める
- 依存は`Pick<Dependencies, "projectRepo">`で必要なもののみ受け取る

---

## TanStack Query統合

### Server Functions とクエリパターン

TanStack Start の Server Functions と TanStack Query を組み合わせて、型安全なデータフェッチングとキャッシュ管理を実現します。

#### Query パターン（読み取り）

**構成**:

- Server Function: `loadXxxFn`
- Cache Key Generator: `generateLoadXxxCacheKey()`
- Query Options Generator: `generateLoadXxxQueryOptions()`
- Component Hook: `useSuspenseQuery(generateLoadXxxQueryOptions())`

**実装例**:

```typescript
// features/event/actions/queries.ts
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { listEvents } from "@/application/query/event/list-events";

// Server Function
export const loadEventsFn = createServerFn({ method: "GET" }).handler(async () => {
  const result = await listEvents();
  if (Result.isFailure(result)) {
    throw new Error(result.error.message);
  }
  return result.value;
});

// Cache Key Generator
export function generateLoadEventsCacheKey() {
  return ["events"];
}

// Query Options Generator
export function generateLoadEventsQueryOptions() {
  return queryOptions({
    queryKey: generateLoadEventsCacheKey(),
    queryFn: loadEventsFn,
  });
}
```

**Route での使用**:

```typescript
// routes/admin/events.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { generateLoadEventsQueryOptions } from "@/features/event/actions";

export const Route = createFileRoute("/admin/events")({
  loader: async ({ context }) =>
    context.queryClient.ensureQueryData(generateLoadEventsQueryOptions()),
  component: EventsPage,
});

function EventsPage() {
  const { data: events } = useSuspenseQuery(generateLoadEventsQueryOptions());
  // ...
}
```

**パターンの特徴**:

- loader で `ensureQueryData` を使いプリフェッチ
- component で `useSuspenseQuery` を使いデータ取得
- 同じ query options を使うことでキャッシュが共有される
- SSR 時にサーバーでデータがフェッチされる

---

### Mutation パターン（書き込み）

**構成**:

- Server Function: `xxxFn` (createEventFn, updateEventFn など)
- Mutation Hook: `useXxxMutation()`
- Cache Invalidation: `onSuccess` で `Result.inspect` を使用

#### 基本パターン

```typescript
// features/event/actions/mutations.ts
import { createServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Result } from "@praha/byethrow";
import { generateLoadEventsCacheKey } from "./queries";

// Server Function
export const createEventFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(createEventInputSchema)
  .handler(async ({ data, context }) => {
    // ... command実行
    return result; // Result<Output, Error>を返す
  });

// Mutation Hook
export function useCreateEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEventFn,
    onSuccess: Result.inspect(() => {
      // 成功時のみキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: generateLoadEventsCacheKey() });
    }),
  });
}
```

**`Result.inspect` の使い方**:

`Result.inspect` は、Result が成功の場合のみ副作用を実行する関数です。

```typescript
// Pattern 1: 引数なしの場合
onSuccess: Result.inspect(() => {
  queryClient.invalidateQueries({ queryKey: generateLoadEventsCacheKey() });
});

// Pattern 2: Result の値を使う場合
onSuccess: Result.inspect(({ eventId }) => {
  queryClient.invalidateQueries({ queryKey: generateLoadEventsCacheKey() });
  queryClient.invalidateQueries({ queryKey: generateLoadEventDetailCacheKey(eventId) });
});

// Pattern 3: variables から値を取得する場合（Result に含まれない情報）
onSuccess: (result, variables) => {
  Result.inspect(() => {
    queryClient.invalidateQueries({
      queryKey: generateLoadUsersForEventCacheKey(variables.data.eventId),
    });
  })(result);
};
```

**Component での使用**:

```typescript
// features/event/components/create-event-dialog.tsx
import { useCreateEventMutation } from "@/features/event/actions";

export function CreateEventDialog() {
  const { mutateAsync } = useCreateEventMutation();

  const form = useForm({
    validators: {
      onSubmitAsync: async ({ value }) => {
        const result = await mutateAsync({ data: value });

        if (Result.isFailure(result)) {
          // エラーハンドリング
          return { fields: { ... } };
        }

        return undefined; // 成功時
      },
    },
    onSubmit: async ({ value }) => {
      // onSuccessでキャッシュが無効化されるので、ここでは何もしない
      toaster.create({ type: "success", title: "作成しました" });
    },
  });
}
```

**パターンの利点**:

- キャッシュ無効化が mutation hook に集約される
- component は mutation hook を呼ぶだけでキャッシュが自動更新される
- `Result.inspect` により、成功時のみ副作用が実行される
- エラー時の処理は component で行う（ユーザーへのフィードバック）

---

### パターンまとめ

| 側面                   | Query（読み取り）                  | Mutation（書き込み）                |
| ---------------------- | ---------------------------------- | ----------------------------------- |
| **Server Function**    | `loadXxxFn`                        | `xxxFn` (createXxx, updateXxx など) |
| **Hook**               | `useSuspenseQuery`                 | `useXxxMutation`                    |
| **キャッシュキー**     | `generateLoadXxxCacheKey()`        | -                                   |
| **Query Options**      | `generateLoadXxxQueryOptions()`    | -                                   |
| **Route での使用**     | loader で `ensureQueryData`        | action で mutation を呼ぶ           |
| **Component での使用** | `useSuspenseQuery(queryOptions())` | `useXxxMutation()` からフック取得   |
| **キャッシュ更新**     | -                                  | `onSuccess` + `Result.inspect`      |
| **エラーハンドリング** | throw Error                        | Result型を返し、component で処理    |

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
│                  │         │ - Domain service │
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

### 2. ドメインサービスのテスト

Repositoryをモックして注入し、ビジネスルールの検証をテストします。

```typescript
// infrastructure/domain-services/event-domain-service.test.ts
import { describe, it, expect, vi } from "vitest";
import { EventDomainServiceImpl } from "./event-domain-service";
import { Result } from "@praha/byethrow";

describe("EventDomainService", () => {
  describe("ensureSlugUnique", () => {
    it("スラッグが未使用の場合、成功を返す", async () => {
      const mockRepo = {
        findBySlug: vi.fn().mockResolvedValue(Result.succeed(null)),
      };

      const service = new EventDomainServiceImpl(mockRepo as any);
      const result = await service.ensureSlugUnique("2026");

      expect(Result.isSuccess(result)).toBe(true);
    });

    it("スラッグが既に使用されている場合、SLUG_NOT_UNIQUEエラーを返す", async () => {
      const mockRepo = {
        findBySlug: vi.fn().mockResolvedValue(Result.succeed({ id: "evt_1", slug: "2026" })),
      };

      const service = new EventDomainServiceImpl(mockRepo as any);
      const result = await service.ensureSlugUnique("2026");

      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.error.code).toBe("SLUG_NOT_UNIQUE");
      }
    });
  });
});
```

### 3. Command（Use Case）のテスト

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

### 4. Query のテスト

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

| バージョン | 日付       | 変更内容                                        |
| ---------- | ---------- | ----------------------------------------------- |
| 1.3.0      | 2026-02-24 | ドメインサービス設計追加（IF+実装分離パターン） |
| 1.2.0      | 2026-02-24 | TanStack Query統合パターン追加（Mutation Hook） |
| 1.1.0      | 2026-02-23 | CQRSパターン導入（Command/Query分離）           |
| 1.0.0      | 2026-02-23 | 初版作成（アーキテクチャ確定）                  |
