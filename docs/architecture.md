# アーキテクチャ設計書

## 目次

1. [概要](#概要)
2. [アーキテクチャ原則](#アーキテクチャ原則)
3. [モノレポ構成](#モノレポ構成)
4. [全体構成](#全体構成)
5. [CQRS パターン](#cqrs-パターン)
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
- **Build**: Turborepo + pnpm workspaces

### 設計方針

- **Domain-Driven Design (DDD)**: ドメインロジックを中心に据えた設計
- **CQRS (Command Query Responsibility Segregation)**: 読み取りと書き込みの責務分離
- **Functional Programming**: 純粋関数とイミュータブルなデータ構造
- **Type Safety**: Zod スキーマによるランタイムバリデーション + Brand型
- **Result型**: 例外を使わない安全なエラーハンドリング
- **Monorepo**: DDD レイヤーをパッケージとして分離し、依存方向を強制

---

## アーキテクチャ原則

### 1. レイヤー分離

各レイヤーは独立したパッケージとして分離され、下位レイヤーへの依存のみ許可します。

```
apps/web (Presentation) → @archive/application (Command/Query) → @archive/domain
                                      ↓
                          @archive/infrastructure
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
export function canSubmit(
  project: Project,
  submissions: ProjectSubmission[],
): Result<true, ProjectError> {
  const hasActive = submissions.some((s) => s.status === "submitted");
  return !hasActive
    ? Result.succeed(true)
    : Result.fail(projectError("ALREADY_SUBMITTED", "既に提出済みです"));
}
```

### 4. 依存性注入（DI）

リポジトリなどの依存は、インスタンス化せず関数引数として注入します。

```typescript
// ✅ DI（必要な依存のみ Pick で受け取る）
export function submitProject(
  deps: Pick<Dependencies, "projectRepo">,
  input: Input,
) { ... }
```

### 5. Zodスキーマからの型派生

型定義を手書きせず、Zodスキーマから派生させます。

```typescript
export const projectSchema = z.object({ ... })
export type Project = z.infer<typeof projectSchema>
```

### 6. Brand型によるID管理

文字列IDは Brand型 で管理し、取り違えを防ぎます。

```typescript
export const projectIdSchema = z.string().brand<"ProjectId">();
export type ProjectId = z.infer<typeof projectIdSchema>;
```

### 7. Result型によるエラーハンドリング

例外（`throw`）を使わず、Result型でエラーを返します。

```typescript
export function canSubmit(project: Project): Result.Result<true, ProjectError> { ... }
```

---

## モノレポ構成

pnpm workspaces + Turborepo によるモノレポ構成で、DDD の各レイヤーを独立したパッケージとして管理します。

```
archive/
├── apps/
│   └── web/                         # Presentation層（TanStack Start + Cloudflare Workers）
├── packages/
│   ├── domain/                      # Domain層（スキーマ、ロジック、エラー、サービスIF）
│   ├── application/                 # Application層（Command / Query, CQRS）
│   ├── infrastructure/              # Infrastructure層（DB、リポジトリ、認証、ストレージ）
│   ├── result/                      # Result型ユーティリティ
│   ├── ui/                          # UI コンポーネント + Panda CSS プリセット
│   ├── styled-system/               # Panda CSS 生成出力
│   └── config/                      # 共通設定（TypeScript, oxlint）
└── docs/
    └── architecture.md
```

### パッケージ依存関係

```
apps/web
  ├── @archive/application
  │     ├── @archive/domain
  │     │     └── @archive/result
  │     └── @archive/infrastructure
  │           ├── @archive/domain
  │           └── @archive/result
  ├── @archive/ui
  │     └── @archive/styled-system
  └── @archive/infrastructure (直接参照: DB初期化、DI)
```

### インポートパターン

- **パッケージ間**: `@archive/*` (例: `import { Project } from "@archive/domain/project/schema"`)
- **apps/web 内部**: `@/` エイリアス (例: `import { getSessionFn } from "@/libs/auth"`)

---

### パッケージ別ディレクトリ構造

#### packages/domain（Domain層）

```
packages/domain/src/
├── authorization/              # 認可ドメイン
│   ├── schema.ts               # Actor, Resource, Action 型定義
│   ├── logic.ts                # 権限判定ロジック + リソース生成ヘルパー
│   ├── errors.ts               # エラー型
│   └── service.ts              # AuthorizationService IF
├── event/                      # イベントドメイン
│   ├── schema.ts               # Event, Tag, Place, Deadline スキーマ
│   ├── logic.ts                # ドメインロジック
│   ├── errors.ts               # エラー型
│   ├── repository.ts           # Repository IF
│   └── service.ts              # EventDomainService IF
├── organization/               # 団体ドメイン
│   ├── schema.ts               # Organization, OrgMember スキーマ
│   ├── logic.ts                # ドメインロジック
│   ├── errors.ts               # エラー型
│   ├── repository.ts           # Repository IF
│   └── service.ts              # OrganizationDomainService IF
├── project/                    # 企画ドメイン
│   ├── schema.ts               # Project, Draft, Submission, Published スキーマ
│   ├── logic.ts                # ドメインロジック
│   ├── errors.ts               # エラー型
│   └── repository.ts           # Repository IF
├── user/                       # ユーザードメイン
│   ├── schema.ts               # User スキーマ
│   ├── logic.ts                # ドメインロジック
│   ├── errors.ts               # エラー型
│   └── repository.ts           # Repository IF
└── shared/                     # 共通定義
    ├── ids.ts                  # Brand型ID（全集約共通）
    ├── errors.ts               # 共通エラー型 + DomainErrorCodeOf
    ├── repository.ts           # RepositoryError 型
    └── storage.ts              # StorageService IF
```

#### packages/application（Application層）

```
packages/application/src/
├── command/                     # Command側（書き込み）
│   ├── event/                  # イベント管理コマンド
│   ├── organization/           # 団体管理コマンド
│   ├── project/                # 企画管理コマンド
│   ├── user/                   # ユーザー管理コマンド
│   └── shared/                 # 共通コマンドユーティリティ
├── query/                      # Query側（読み取り）
│   ├── authorization/          # 認可情報クエリ
│   ├── event/                  # イベント関連クエリ
│   ├── organization/           # 団体関連クエリ
│   ├── project/                # 企画関連クエリ
│   ├── user/                   # ユーザー関連クエリ
│   └── shared.ts               # 共通クエリユーティリティ
└── test/                       # テストヘルパー
```

#### packages/infrastructure（Infrastructure層）

```
packages/infrastructure/src/
├── auth/                       # Better Auth 設定
├── db/                         # データベース
│   ├── schema.ts               # Drizzle スキーマ
│   ├── auth-schema.ts          # Better Auth スキーマ
│   ├── index.ts                # DB クライアント
│   └── migrations/             # SQLマイグレーション
├── repositories/               # Repository 実装（集約ごと）
├── services/                   # ドメインサービス実装
└── storage/                    # StorageService 実装（R2）
```

#### apps/web（Presentation層）

```
apps/web/src/
├── api/                        # HTTP API（Hono）
├── features/                   # 機能別モジュール（TanStack Query 統合）
│   ├── <feature>/
│   │   ├── actions/            # Server Functions + Query Options + Mutation Hooks
│   │   └── components/         # 機能固有の UI コンポーネント
│   └── ...
├── routes/                     # TanStack Router（ファイルベースルーティング）
│   ├── __root.tsx              # ルートレイアウト
│   ├── _authenticated/         # 認証済みルート
│   │   └── $slug/              # イベントスコープ
│   │       ├── committee/      # 実行委員向けページ
│   │       └── orgs/           # 団体向けページ
│   ├── _public/                # 公開ルート
│   └── admin/                  # 管理画面
├── components/                 # 共通 UI コンポーネント
├── libs/                       # ユーティリティ（認証、DB初期化、DI、日付等）
├── integrations/               # TanStack Query devtools
├── router.tsx                  # Router 設定
└── server.ts                   # Cloudflare Workers エントリーポイント
```

---

## 全体構成

### レイヤーアーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│      Presentation Layer (apps/web)                   │
│  ┌──────────────┐  ┌──────────────┐                │
│  │   routes/    │  │  features/   │                │
│  │ - loader     │  │ - components │                │
│  │ - component  │  │ - actions    │                │
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
│  @archive/       │        │  @archive/       │
│  application     │        │  application     │
│    /query        │        │    /command       │
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
         │                  │  @archive/domain │
         │                  │  - schema.ts     │
         │                  │  - logic.ts      │
         │                  │  - service.ts    │
         │                  │  - errors.ts     │
         │                  └──────────────────┘
         │                           │
         └───────────┬───────────────┘
                     ▼
         ┌──────────────────────────────┐
         │  Infrastructure Layer        │
         │  @archive/infrastructure     │
         │  - repositories/             │
         │  - services/                 │
         │  - auth/                     │
         │  - storage/                  │
         └──────────────────────────────┘
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

| 側面             | Command (書き込み)              | Query (読み取り)              |
| ---------------- | ------------------------------- | ----------------------------- |
| **目的**         | ビジネスロジック実行、状態変更  | データ表示                    |
| **パッケージ**   | `@archive/application` command/ | `@archive/application` query/ |
| **使用場所**     | Server Function (POST)          | Server Function (GET)         |
| **データソース** | Repository (集約単位)           | 直接DB (JOIN可能)             |
| **戻り値**       | 集約モデル（Domain型）          | DTO（表示用型）               |
| **制約**         | 集約の不変条件を守る            | 制約なし（読み取り専用）      |
| **最適化**       | トランザクション、整合性        | パフォーマンス、キャッシュ    |
| **スキーマ**     | Domain schemaを使用             | zod schemaでDTO定義           |

### DTO定義規則

Queryでは、ドメインモデルとは別にDTO（Data Transfer Object）を定義します。

**原則**:

- DTOはクエリ関数と同じファイルに定義（`types.ts`は作らない）
- zod schemaで定義し、型は`z.infer`で派生
- 表示に必要なフィールドのみ含む

---

## レイヤー設計

### Domain層（`@archive/domain`）

**責務**: ビジネスルール・不変条件・ドメインロジック

**原則**:

- `logic.ts`: 純粋関数のみ（I/O禁止）
- `service.ts`: ドメインサービスの**インターフェース定義**のみ（実装はインフラ層）
- Zodスキーマで型定義
- Result型でエラーを返す

**ファイル構成**:

| ファイル        | 責務                                                  |
| --------------- | ----------------------------------------------------- |
| `schema.ts`     | Zodスキーマ定義 + 型派生                              |
| `logic.ts`      | ドメインロジック（純粋関数、I/O不要なビジネスルール） |
| `service.ts`    | ドメインサービスIF（I/Oが必要なビジネスルール）       |
| `errors.ts`     | エラーコード定数 + エラー型 + ファクトリ関数          |
| `repository.ts` | Repository IF（各集約ごと）                           |

---

### Infrastructure層（`@archive/infrastructure`）

**責務**: 永続化・外部システム連携・I/O操作

**原則**:

- Repository パターンでドメイン層から隔離
- インターフェースはドメイン層で定義、実装はインフラ層で提供
- DIコンテナで依存を管理

---

### Application層（`@archive/application`）

CQRSパターンに従い、Command（書き込み）とQuery（読み取り）に分離します。

#### Command（書き込み）

**責務**: ビジネスフローの調整・トランザクション管理

```typescript
export async function createEvent(
  deps: Pick<Dependencies, "eventRepo" | "authService" | "eventDomainService">,
  input: CreateEventInput,
): Result.ResultAsync<CreateEventOutput, CreateEventError> {
  return gen(async function* ($) {
    // 1. 認可チェック
    yield* $(deps.authService.enforce(input.actor, resource, "event:create"));
    // 2. ドメインサービス（I/O必要なルール）
    yield* $(await deps.eventDomainService.ensureSlugUnique(input.slug));
    // 3. ドメインロジック（純粋関数）
    const event = yield* $(createEventEntity({ ... }));
    // 4. 永続化
    yield* $(await deps.eventRepo.saveEvent(event));
    return { eventId };
  });
}
```

#### Query（読み取り）

**責務**: 表示に最適化されたデータ取得

```typescript
// DTO schema + Query function を同一ファイルに定義
export const eventListItemSchema = z.object({
  id: eventIdSchema,
  name: z.string(),
  slug: z.string(),
  status: z.enum(["active", "archived"]),
  createdAt: z.date(),
});

export type EventListItem = z.infer<typeof eventListItemSchema>;

export async function listEvents(): Promise<Result.Result<EventListItem[], QueryError>> {
  try {
    const rows = await db.query.events.findMany({ orderBy: [desc(events.createdAt)] });
    return Result.succeed(rows.map((row) => eventListItemSchema.parse({ ... })));
  } catch (error) {
    return Result.fail({ code: "DATABASE_ERROR", message: "..." });
  }
}
```

---

### Presentation層（`apps/web`）

**責務**: UI表示・ユーザーインタラクション

**構成**:

- `routes/`: TanStack Router ファイルベースルーティング（loader + component）
- `features/`: 機能別モジュール（actions + components）
- `components/`: 共通 UI コンポーネント
- `@archive/ui`: Park UI ベースの再利用コンポーネントライブラリ

---

## ドメインサービス

### logic.ts とドメインサービスの違い

| 側面         | `logic.ts`（純粋関数）             | `service.ts`（ドメインサービス）       |
| ------------ | ---------------------------------- | -------------------------------------- |
| **I/O**      | なし（純粋関数）                   | あり（Repository経由）                 |
| **定義場所** | ドメイン層で実装まで完結           | ドメイン層にIF、インフラ層に実装       |
| **テスト**   | モック不要                         | Repository をモックして注入            |
| **用途**     | 単一エンティティの不変条件チェック | 集約を超えた一意性検証、整合性チェック |

### ドメイン層: インターフェース

```typescript
// packages/domain/src/event/service.ts
export interface EventDomainService {
  ensureSlugUnique(
    slug: string,
    excludeEventId?: EventId,
  ): Promise<Result.Result<true, EventError | RepositoryError>>;

  resolveModifiableEvent(
    eventId: EventId,
  ): Promise<Result.Result<Event, EventError | RepositoryError>>;
}
```

### インフラ層: 実装

```typescript
// packages/infrastructure/src/services/event-domain-service.ts
export class EventDomainServiceImpl implements EventDomainService {
  constructor(private readonly eventRepo: EventRepository) {}

  async ensureSlugUnique(slug: string): Promise<Result.Result<true, EventError | RepositoryError>> {
    return gen(async function* ($) {
      const existing = yield* $(await this.eventRepo.findBySlug(slug));
      if (existing !== null) {
        return yield* $(Result.fail(eventError(EVENT_ERROR_CODE.SLUG_NOT_UNIQUE, "...")));
      }
      return true;
    });
  }
}
```

### DI への登録

```typescript
// apps/web/src/libs/dependencies.ts
export type Dependencies = {
  // Repositories
  projectRepo: ProjectRepository;
  eventRepo: EventRepository;
  organizationRepo: OrganizationRepository;
  userRepo: UserRepository;
  // Domain Services
  eventDomainService: EventDomainService;
  organizationDomainService: OrganizationDomainService;
  // Application Services
  authService: AuthorizationService;
  storageService: StorageService;
};

export function createDependencies(): Dependencies {
  const eventRepo = new EventRepositoryImpl();
  const organizationRepo = new OrganizationRepositoryImpl();
  return {
    projectRepo: new ProjectRepositoryImpl(),
    eventRepo,
    userRepo: new UserRepositoryImpl(),
    organizationRepo,
    eventDomainService: new EventDomainServiceImpl(eventRepo),
    organizationDomainService: new OrganizationDomainServiceImpl(organizationRepo),
    authService: new AuthorizationServiceImpl(),
    storageService: new StorageServiceImpl(),
  };
}

export const dependencies = createDependencies();
```

---

## 型システム設計

### Zodスキーマからの型派生

すべての型は Zod スキーマから派生させます。

```typescript
// packages/domain/src/project/schema.ts

// バリデーション定数
export const PROJECT_NAME_MIN_LENGTH = 1;
export const PROJECT_NAME_MAX_LENGTH = 100;
export const PROJECT_PAMPHLET_TEXT_MAX_LENGTH = 120;

// Zodスキーマ定義
export const projectSchema = z.object({
  id: projectIdSchema,
  eventId: eventIdSchema,
  orgId: orgIdSchema,
  name: z.string().min(PROJECT_NAME_MIN_LENGTH).max(PROJECT_NAME_MAX_LENGTH),
  placeId: placeIdSchema.nullable(),
  logoKey: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// 型派生
export type Project = z.infer<typeof projectSchema>;
```

### Brand型によるID管理

```typescript
// packages/domain/src/shared/ids.ts
export const projectIdSchema = z.string().brand<"ProjectId">();
export const eventIdSchema = z.string().brand<"EventId">();
export const orgIdSchema = z.string().brand<"OrgId">();
export const submissionIdSchema = z.string().brand<"SubmissionId">();
export const userIdSchema = z.string().brand<"UserId">();
export const tagIdSchema = z.string().brand<"TagId">();
export const placeIdSchema = z.string().brand<"PlaceId">();
export const deadlineIdSchema = z.string().brand<"DeadlineId">();
// ...

// 型派生
export type ProjectId = z.infer<typeof projectIdSchema>;
// ...

// キャストユーティリティ（外部データからの変換用）
export function cast<T extends string>(id: string): T {
  return z.string().parse(id) as T;
}
```

### 複合型

タグなどの関連データを含む複合型は、ベーススキーマの `extend` で定義します。

```typescript
// packages/domain/src/project/schema.ts
export const draftWithTagsSchema = projectDraftSchema.extend({
  tags: z.array(tagIdSchema),
});
export type DraftWithTags = z.infer<typeof draftWithTagsSchema>;

export const submissionWithTagsSchema = projectSubmissionSchema.extend({
  tags: z.array(tagIdSchema),
});
export type SubmissionWithTags = z.infer<typeof submissionWithTagsSchema>;
```

---

## エラーハンドリング戦略

### エラー型の構造

```typescript
// packages/domain/src/shared/errors.ts

// 共通エラーコード（全ドメインで使用可能）
export const DOMAIN_ERROR_CODE = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;

export type DomainErrorCode = (typeof DOMAIN_ERROR_CODE)[keyof typeof DOMAIN_ERROR_CODE];

// コンテキスト固有のエラーコードと共通コードの合成型
export type DomainErrorCodeOf<T> = T[keyof T] | DomainErrorCode;

// 基底エラー型
export type BaseError<TCode extends string = string> = {
  code: TCode;
  message: string;
};

export function createError<TCode extends string>(code: TCode, message: string): BaseError<TCode> {
  return { code, message };
}
```

### ドメインごとのエラー定義

```typescript
// packages/domain/src/event/errors.ts
export const EVENT_ERROR_CODE = {
  EVENT_ARCHIVED: "EVENT_ARCHIVED",
  SLUG_NOT_UNIQUE: "SLUG_NOT_UNIQUE",
  EVENT_NOT_FOUND: "EVENT_NOT_FOUND",
  // ...
} as const;

// DomainErrorCodeOf で共通コード（VALIDATION_ERROR）も含む
export type EventErrorCode = DomainErrorCodeOf<typeof EVENT_ERROR_CODE>;
export type EventError = BaseError<EventErrorCode>;

export function eventError(code: EventErrorCode, message: string): EventError {
  return createError(code, message);
}
```

### gen関数によるResultハンドリング

`gen` 関数を使うと、Result型を簡潔に扱えます。

```typescript
import { gen } from "@archive/result";

export function createEvent(deps: Dependencies, input: Input) {
  return gen(async function* ($) {
    // yield* $() で Result をアンラップ。失敗時は自動的に早期リターン
    yield* $(deps.authService.enforce(input.actor, resource, "event:create"));
    yield* $(await deps.eventDomainService.ensureSlugUnique(input.slug));
    const event = yield* $(createEventEntity({ ... }));
    yield* $(await deps.eventRepo.saveEvent(event));
    return { eventId };
  });
}
```

---

## 実装パターン

### packages/domain/src/project/schema.ts

```typescript
import { z } from "zod";
import {
  eventIdSchema,
  orgIdSchema,
  projectIdSchema,
  submissionIdSchema,
  tagIdSchema,
  userIdSchema,
} from "../shared/ids";

export const PROJECT_NAME_MIN_LENGTH = 1;
export const PROJECT_NAME_MAX_LENGTH = 100;
export const PROJECT_PAMPHLET_TEXT_MAX_LENGTH = 120;

// Aggregate Root
export const projectSchema = z.object({
  id: projectIdSchema,
  eventId: eventIdSchema,
  orgId: orgIdSchema,
  name: z.string().min(PROJECT_NAME_MIN_LENGTH).max(PROJECT_NAME_MAX_LENGTH),
  placeId: placeIdSchema.nullable(),
  logoKey: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Project = z.infer<typeof projectSchema>;

// Status enum
export const submissionStatusSchema = z.enum(["submitted", "returned", "approved", "withdrawn"]);
export type SubmissionStatus = z.infer<typeof submissionStatusSchema>;

// Draft
export const projectDraftSchema = z.object({
  projectId: projectIdSchema,
  pamphletText: z.string().max(PROJECT_PAMPHLET_TEXT_MAX_LENGTH),
  webContentJson: z.json().nullable(),
  updatedAt: z.date(),
  updatedBy: userIdSchema,
});
export type ProjectDraft = z.infer<typeof projectDraftSchema>;

// Submission（不変スナップショット）
export const projectSubmissionSchema = z.object({
  id: submissionIdSchema,
  projectId: projectIdSchema,
  status: submissionStatusSchema,
  pamphletText: z.string().max(PROJECT_PAMPHLET_TEXT_MAX_LENGTH),
  webContentJson: z.json().nullable(),
  submittedAt: z.date(),
  submittedBy: userIdSchema,
});
export type ProjectSubmission = z.infer<typeof projectSubmissionSchema>;

// Published（承認済みスナップショット）
export const projectPublishedSchema = z.object({
  projectId: projectIdSchema,
  pamphletText: z.string().max(PROJECT_PAMPHLET_TEXT_MAX_LENGTH),
  webContentJson: z.json().nullable(),
  publishedAt: z.date(),
  publishedBy: userIdSchema,
});
export type ProjectPublished = z.infer<typeof projectPublishedSchema>;

// タグ付き複合型
export const draftWithTagsSchema = projectDraftSchema.extend({
  tags: z.array(tagIdSchema),
});
export type DraftWithTags = z.infer<typeof draftWithTagsSchema>;

export const submissionWithTagsSchema = projectSubmissionSchema.extend({
  tags: z.array(tagIdSchema),
});
export type SubmissionWithTags = z.infer<typeof submissionWithTagsSchema>;
```

---

### packages/domain/src/project/logic.ts

```typescript
import { Result } from "@praha/byethrow";
import type { DraftWithTags, Project } from "./schema";
import { draftWithTagsSchema, projectSchema } from "./schema";
import type { ProjectError } from "./errors";
import { projectError } from "./errors";
import { DOMAIN_ERROR_CODE } from "../shared/errors";

/**
 * Create a new Project entity (validates with zod schema)
 */
export function createProjectEntity(input: {
  id: ProjectId;
  eventId: EventId;
  orgId: OrgId;
  name: string;
  placeId: string | null;
  logoKey: string | null;
  now?: Date;
}): Result.Result<Project, ProjectError> {
  const now = input.now ?? new Date();
  return Result.try({
    try: () =>
      projectSchema.parse({
        ...input,
        createdAt: now,
        updatedAt: now,
      }),
    catch: () => projectError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "企画の作成に失敗しました"),
  });
}

/**
 * Create a new ProjectDraft entity with initial empty values
 */
export function createProjectDraftEntity(input: {
  projectId: ProjectId;
  updatedBy: UserId;
  tags?: TagId[];
  now?: Date;
}): Result.Result<DraftWithTags, ProjectError> {
  const now = input.now ?? new Date();
  return Result.try({
    try: () =>
      draftWithTagsSchema.parse({
        projectId: input.projectId,
        pamphletText: "",
        webContentJson: null,
        updatedAt: now,
        updatedBy: input.updatedBy,
        tags: input.tags ?? [],
      }),
    catch: () => projectError(DOMAIN_ERROR_CODE.VALIDATION_ERROR, "下書きの作成に失敗しました"),
  });
}
```

---

### packages/application/src/command/event/create-event.ts（Commandパターン）

```typescript
import { Result } from "@praha/byethrow";
import { gen } from "@archive/result";
import type { EventId } from "@archive/domain/shared/ids";
import type { EventError } from "@archive/domain/event/errors";
import type { RepositoryError } from "@archive/domain/shared/repository";
import type { AuthorizationError } from "@archive/domain/authorization/errors";
import { createEventEntity } from "@archive/domain/event/logic";
import { eventResource } from "@archive/domain/authorization/logic";
import type { Dependencies } from "@archive/application/command/shared/dependencies";

export type CreateEventInput = {
  name: string;
  slug: string;
  actor: Actor;
};

export type CreateEventOutput = { eventId: EventId };
export type CreateEventError = EventError | RepositoryError | AuthorizationError;

export async function createEvent(
  deps: Pick<Dependencies, "eventRepo" | "authService" | "eventDomainService">,
  input: CreateEventInput,
): Result.ResultAsync<CreateEventOutput, CreateEventError> {
  return gen(async function* ($) {
    // 1. 認可チェック
    const resource = eventResource(input.eventId);
    yield* $(deps.authService.enforce(input.actor, resource, "event:create"));

    // 2. ドメインサービス（一意性チェック）
    const eventId = generateId<EventId>();
    yield* $(await deps.eventDomainService.ensureSlugUnique(input.slug));

    // 3. ドメインロジック（エンティティ生成）
    const event = yield* $(createEventEntity({ id: eventId, name: input.name, slug: input.slug }));

    // 4. 永続化
    yield* $(await deps.eventRepo.saveEvent(event));

    return { eventId };
  });
}
```

---

## TanStack Query統合

### features/ ディレクトリパターン

`apps/web/src/features/` ディレクトリは、Application層とPresentation層をつなぐ統合レイヤーです。

```
apps/web/src/features/<feature>/
├── actions/
│   ├── index.ts         # re-export
│   ├── queries.ts       # Server Functions (GET) + Cache Key + Query Options
│   └── mutations.ts     # Server Functions (POST) + Input Schema + Mutation Hooks
└── components/
    ├── index.ts         # re-export
    └── *.tsx            # 機能固有コンポーネント
```

### Query パターン（読み取り）

**命名規則**:

| 要素                | 命名規則                                    | 例                             |
| ------------------- | ------------------------------------------- | ------------------------------ |
| Server Function     | `load<Entity><Purpose>Fn`                   | `loadTagsFn`                   |
| Cache Key Generator | `generateLoad<Entity><Purpose>CacheKey`     | `generateLoadTagsCacheKey`     |
| Query Options       | `generateLoad<Entity><Purpose>QueryOptions` | `generateLoadTagsQueryOptions` |

**実装例**:

```typescript
// apps/web/src/features/event/actions/queries/tag.ts
export const loadTagsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ eventId: eventIdSchema }))
  .handler(async ({ data }) => {
    const result = await listTags(data.eventId);
    if (Result.isFailure(result)) {
      throw new Error(result.error.message);
    }
    return result.value;
  });

export function generateLoadTagsCacheKey(eventId: string) {
  return ["events", eventId, "tags"];
}

export function generateLoadTagsQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: generateLoadTagsCacheKey(eventId),
    queryFn: () => loadTagsFn({ data: { eventId } }),
  });
}
```

### Mutation パターン（書き込み）

**命名規則**:

| 要素            | 命名規則                      | 例                     |
| --------------- | ----------------------------- | ---------------------- |
| Input Schema    | `<action><Entity>InputSchema` | `createTagInputSchema` |
| Server Function | `<action><Entity>Fn`          | `createTagFn`          |
| Mutation Hook   | `use<Action><Entity>Mutation` | `useCreateTagMutation` |

**実装例**:

```typescript
// apps/web/src/features/event/actions/mutations/tag.ts
export const createTagInputSchema = z.object({
  eventId: eventIdSchema,
  name: tagSchema.shape.name,
});

export const createTagFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(createTagInputSchema)
  .handler(async ({ data, context }) => {
    return await gen(async function* ($) {
      const actor = yield* $(
        await resolveActor({
          userId: cast<UserId>(context.session.user.id),
          eventIds: [data.eventId],
        }),
      );
      return yield* $(await createTag(dependencies, { ...data, actor }));
    });
  });

export function useCreateTagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTagFn,
    onSuccess: Result.inspect(async ({ eventId }) => {
      await queryClient.invalidateQueries({ queryKey: generateLoadTagsCacheKey(eventId) });
    }),
  });
}
```

**`Result.inspect` の使い方**:

```typescript
// Pattern 1: Result の値を使う（単一の invalidate）
onSuccess: Result.inspect(async ({ eventId }) => {
  await queryClient.invalidateQueries({ queryKey: generateLoadTagsCacheKey(eventId) });
});

// Pattern 2: 複数の invalidate は Promise.all で並列実行
onSuccess: Result.inspect(async ({ eventId }) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: generateLoadEventsCacheKey() }),
    queryClient.invalidateQueries({ queryKey: generateLoadEventDetailCacheKey(eventId) }),
  ]);
});
```

### Route 統合パターン

```typescript
// apps/web/src/routes/_authenticated/$slug/committee/tags.tsx
export const Route = createFileRoute("/_authenticated/$slug/committee/tags")({
  loader: async ({ params, context }) => {
    const event = await context.queryClient.ensureQueryData(
      generateLoadEventBySlugQueryOptions(params.slug),
    );
    await context.queryClient.ensureQueryData(generateLoadTagsQueryOptions(event.id));
  },
  component: TagsPage,
});

function TagsPage() {
  const { slug } = Route.useParams();
  const { data: event } = useSuspenseQuery(generateLoadEventBySlugQueryOptions(slug));
  const { data: tags } = useSuspenseQuery(generateLoadTagsQueryOptions(event.id));
  // ...
}
```

### Form 統合パターン（TanStack Form）

```typescript
// apps/web/src/features/event/components/create-tag-dialog.tsx
const { mutateAsync } = useCreateTagMutation();

const form = useForm({
  defaultValues: { name: "" },
  validators: {
    onDynamic: createTagInputSchema.omit({ eventId: true }),
    onSubmitAsync: async ({ value }) => {
      const result = await mutateAsync({ data: { ...value, eventId } });

      if (Result.isFailure(result)) {
        // フィールドレベルエラー
        if (result.error.code === "TAG_NOT_UNIQUE") {
          return { fields: { name: { message: result.error.message } } };
        }
        // トーストで通知
        toaster.create({ type: "error", description: result.error.message });
        return {};
      }
      return undefined; // 成功 → onSubmit が呼ばれる
    },
  },
  onSubmit: async () => {
    toaster.create({ type: "success", title: "作成しました" });
    form.reset();
  },
});
```

### パターンまとめ

| 側面                   | Query（読み取り）                  | Mutation（書き込み）             |
| ---------------------- | ---------------------------------- | -------------------------------- |
| **Server Function**    | `loadXxxFn`                        | `<action>XxxFn`                  |
| **Hook**               | `useSuspenseQuery`                 | `use<Action>XxxMutation`         |
| **キャッシュキー**     | `generateLoadXxxCacheKey()`        | -                                |
| **Query Options**      | `generateLoadXxxQueryOptions()`    | -                                |
| **Route での使用**     | loader で `ensureQueryData`        | component から mutation hook     |
| **Component での使用** | `useSuspenseQuery(queryOptions())` | `mutateAsync` + Result判定       |
| **キャッシュ更新**     | -                                  | `onSuccess` + `Result.inspect`   |
| **エラーハンドリング** | throw Error                        | Result型を返し、component で処理 |

---

## データフロー

### Command（書き込み）フロー

```
UI (form submit)
  → Mutation Hook (mutateAsync)
    → Server Function (POST)
      → resolveActor (認可コンテキスト取得)
      → Command (@archive/application/command/)
        ├─ authService.enforce (認可チェック)
        ├─ DomainService (I/O必要なルール)
        ├─ Domain Logic (純粋関数)
        └─ Repository (永続化)
      ← Result<Output, Error>
    ← Result (onSuccess でキャッシュ無効化)
  ← Result.isFailure → エラー表示 / 成功トースト
```

### Query（読み取り）フロー

```
Route loader
  → ensureQueryData(queryOptions)
    → Server Function (GET)
      → Query (@archive/application/query/)
        ├─ 直接DB (Drizzle ORM)
        └─ DTO変換 (zod parse)
      ← Result<DTO[], QueryError>
    ← throw on failure / return value
  → Cache populated

Component render
  → useSuspenseQuery(queryOptions)
    → Cache hit (loader でプリフェッチ済み)
  ← data
```

### CQRS データフロー全体像

```
┌─────────────────────────────────────────────────────┐
│              Presentation (apps/web)                 │
│  ┌────────────────┐         ┌────────────────┐     │
│  │  routes/loader │         │  features/     │     │
│  │  (プリフェッチ)│         │  actions/      │     │
│  │                │         │  mutations.ts  │     │
│  └────────────────┘         └────────────────┘     │
└─────────────────────────────────────────────────────┘
         │                              │
         │ Query                        │ Command
         ▼                              ▼
┌──────────────────┐         ┌──────────────────┐
│ @archive/        │         │ @archive/        │
│ application      │         │ application      │
│   /query         │         │   /command       │
│                  │         │                  │
│ - DTO定義(zod)   │         │ - Use Cases      │
│ - 直接DB         │         │ - Repository経由 │
│ - JOIN可能       │         │ - Domain logic   │
│                  │         │ - Domain service │
└──────────────────┘         └──────────────────┘
         │                              │
         │                              ▼
         │                    ┌──────────────────┐
         │                    │ @archive/domain  │
         │                    │   - logic.ts     │
         │                    │   - schema.ts    │
         │                    │   - service.ts   │
         │                    └──────────────────┘
         │                              │
         └──────────┬───────────────────┘
                    ▼
         ┌─────────────────────────┐
         │ @archive/infrastructure │
         │  - repositories/        │
         │  - services/            │
         │  - auth/                │
         │  - DB (Drizzle)         │
         └─────────────────────────┘
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

### Actor 型

```typescript
// packages/domain/src/authorization/schema.ts
export type Actor = {
  userId: UserId;
  globalRole: GlobalRole; // "admin" | "user"
  committeeRoles: Map<EventId, CommitteeRole>; // イベントごとの委員会ロール
  orgRoles: Map<OrgId, OrgRole>; // 団体ごとのロール
};
```

### Resource 型

リソースごとに型を定義し、認可チェック時に使用します。

```typescript
// packages/domain/src/authorization/logic.ts
export function eventResource(eventId: EventId): EventResource;
export function organizationResource(orgId: OrgId, eventId: EventId): OrganizationResource;
export function projectResource(
  projectId: ProjectId,
  eventId: EventId,
  orgId: OrgId,
): ProjectResource;
```

### 認可フロー

```
1. resolveActor({ userId, eventIds, orgIds })
   → ユーザーのロール・メンバーシップを取得し Actor 型を構築

2. authService.enforce(actor, resource, action)
   → Actor のロールに基づき権限を判定
   → 権限がなければ AuthorizationError を返す
```

詳細は `packages/domain/src/authorization/` を参照。

---

## テスト戦略

### 1. ドメインロジックのテスト

純粋関数なので、モック不要でテストできます。

```typescript
// packages/domain/src/event/logic.test.ts
describe("createEventEntity", () => {
  it("正常な入力でイベントを作成できる", () => {
    const result = createEventEntity({ id: eventId, name: "学園祭2026", slug: "2026" });
    expect(Result.isSuccess(result)).toBe(true);
  });

  it("不正な入力でVALIDATION_ERRORを返す", () => {
    const result = createEventEntity({ id: eventId, name: "", slug: "2026" });
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });
});
```

### 2. ドメインサービスのテスト

Repositoryをモックして注入します。

```typescript
// packages/infrastructure/src/services/event-domain-service.test.ts
describe("ensureSlugUnique", () => {
  it("未使用のスラッグで成功", async () => {
    const mockRepo = { findBySlug: vi.fn().mockResolvedValue(Result.succeed(null)) };
    const service = new EventDomainServiceImpl(mockRepo as any);
    const result = await service.ensureSlugUnique("2026");
    expect(Result.isSuccess(result)).toBe(true);
  });
});
```

### 3. Command（Use Case）のテスト

依存をモックして注入します。

```typescript
// packages/application/src/command/event/create-event.test.ts
describe("createEvent", () => {
  it("正常系: イベント作成成功", async () => {
    const deps = {
      eventRepo: { saveEvent: vi.fn().mockResolvedValue(Result.succeed(undefined)) },
      authService: { enforce: vi.fn().mockReturnValue(Result.succeed(true)) },
      eventDomainService: { ensureSlugUnique: vi.fn().mockResolvedValue(Result.succeed(true)) },
    };
    const result = await createEvent(deps, input);
    expect(Result.isSuccess(result)).toBe(true);
  });
});
```

---

## 参考資料

### プロジェクト内

- [README](../README.md)
- [DBスキーマ](../packages/infrastructure/src/db/schema.ts)
- [認証スキーマ](../packages/infrastructure/src/db/auth-schema.ts)
- [ドメインモデル](../packages/domain/src/)

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
