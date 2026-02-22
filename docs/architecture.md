# アーキテクチャ設計書

**プロジェクト**: 大学祭企画情報管理システム
**最終更新**: 2026-02-23
**バージョン**: 1.0.0

---

## 目次

1. [概要](#概要)
2. [アーキテクチャ原則](#アーキテクチャ原則)
3. [全体構成](#全体構成)
4. [ディレクトリ構造](#ディレクトリ構造)
5. [レイヤー設計](#レイヤー設計)
6. [型システム設計](#型システム設計)
7. [エラーハンドリング戦略](#エラーハンドリング戦略)
8. [実装パターン](#実装パターン)
9. [データフロー](#データフロー)
10. [権限管理](#権限管理)
11. [テスト戦略](#テスト戦略)
12. [参考資料](#参考資料)

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
- **Functional Programming**: 純粋関数とイミュータブルなデータ構造
- **Type Safety**: Zod スキーマによるランタイムバリデーション + Brand型
- **Result型**: 例外を使わない安全なエラーハンドリング

---

## アーキテクチャ原則

### 1. レイヤー分離

各レイヤーは明確な責務を持ち、下位レイヤーへの依存のみ許可します。

```
Presentation → Controller → Application → Domain
                                ↓
                        Infrastructure
```

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
│         Presentation Layer (既存構造維持)            │
│  ┌──────────────┐  ┌──────────────┐                │
│  │   routes/    │  │ components/  │                │
│  │ (TanStack)   │  │  (React 19)  │                │
│  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────┐
│          Controller Layer (Server Functions)        │
│  controllers/                                        │
│    └─ project/                                       │
│        ├─ submit-project.ts   (createServerFn)      │
│        ├─ approve-project.ts                         │
│        └─ edit-draft.ts                              │
│                                                      │
│  責務: 認証・認可・バリデーション・DI・エラー変換    │
└─────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────┐
│         Application Layer (Use Cases)               │
│  application/                                        │
│    └─ project/                                       │
│        ├─ submit-project.ts   (Pure Function)       │
│        ├─ approve-project.ts                         │
│        └─ edit-draft.ts                              │
│                                                      │
│  責務: ビジネスフローの調整・トランザクション管理    │
└─────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────┐
│         Domain Layer (Pure Functions)               │
│  domain/                                             │
│    └─ project/                                       │
│        ├─ schema.ts       (Zod + 型定義)            │
│        ├─ logic.ts        (純粋関数)                │
│        └─ errors.ts       (エラー型定義)            │
│                                                      │
│  責務: ビジネスルール・不変条件・ドメインロジック    │
└─────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────┐
│         Infrastructure Layer (I/O)                  │
│  infrastructure/                                     │
│    ├─ repositories/                                  │
│    │   ├─ interfaces.ts    (Repository定義)         │
│    │   └─ project-repository.ts (Drizzle実装)      │
│    ├─ storage/                                       │
│    │   └─ r2-storage.ts    (R2クライアント)         │
│    └─ di.ts               (DIコンテナ)              │
│                                                      │
│  責務: 永続化・外部システム連携                      │
└─────────────────────────────────────────────────────┘
```

---

## ディレクトリ構造

```
src/
├── controllers/                  # Controller層（Server Functions）
│   ├── project/
│   │   ├── submit-project.ts     # 企画提出
│   │   ├── approve-project.ts    # 企画承認
│   │   ├── return-project.ts     # 企画差戻し
│   │   ├── withdraw-project.ts   # 企画取り下げ
│   │   └── edit-draft.ts         # Draft編集
│   ├── organization/
│   │   ├── create-org.ts
│   │   ├── update-org.ts
│   │   └── manage-members.ts
│   ├── event/
│   │   ├── create-event.ts
│   │   ├── update-event.ts
│   │   └── archive-event.ts
│   └── admin/
│       ├── assign-committee-role.ts
│       └── manage-deadlines.ts
│
├── application/                  # Application層（Use Cases）
│   ├── project/
│   │   ├── submit-project.ts     # 提出ユースケース
│   │   ├── approve-project.ts    # 承認ユースケース
│   │   ├── return-project.ts     # 差戻しユースケース
│   │   ├── withdraw-project.ts   # 取り下げユースケース
│   │   └── edit-draft.ts         # Draft編集ユースケース
│   ├── organization/
│   │   ├── create-org.ts
│   │   └── add-member.ts
│   └── event/
│       ├── create-event.ts
│       └── archive-event.ts
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

**責務**: ビジネスフローの調整・トランザクション管理

**原則**:

- 依存をDIで受け取る（引数として渡す）
- Result型を返す
- ドメインロジックに委譲
- `gen` 関数でResultをハンドリング

**ファイル構成**:

- `submit-project.ts`: 提出ユースケース
- `approve-project.ts`: 承認ユースケース
- など

**例**: [application/project/submit-project.ts](#applicationprojectsubmit-projectts)

---

### Controller層（コントローラー層）

**責務**: 認証・認可・バリデーション・依存注入・エラー変換

**原則**:

- `createServerFn` を使用
- 認証チェック → 認可チェック → DI → ユースケース実行
- Result型 → HTTPレスポンス変換
- Zodでバリデーション

**ファイル構成**:

- `submit-project.ts`: 企画提出コントローラー
- `approve-project.ts`: 企画承認コントローラー
- など

**例**: [controllers/project/submit-project.ts](#controllersprojectsubmit-projectts)

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

### application/project/submit-project.ts

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

### controllers/project/submit-project.ts

```typescript
import { createServerFn } from "@tanstack/start/server";
import { Result } from "@praha/byethrow";
import { getSession } from "@/libs/session-server";
import { canSubmitProject } from "@/libs/permissions";
import { getDependencies } from "@/infrastructure/di";
import { submitProject as submitProjectUseCase } from "@/application/project/submit-project";
import {
  projectIdSchema,
  userIdSchema,
  type ProjectId,
  type UserId,
} from "@/domain/project/schema";

/**
 * 企画提出コントローラー
 */
export const submitProject = createServerFn({ method: "POST" })
  .validator((data: { projectId: string }) => {
    // Zodでバリデーション + Brand型変換
    const projectId = projectIdSchema.parse(data.projectId);
    return { projectId };
  })
  .handler(async ({ data }) => {
    // 1. 認証チェック
    const session = await getSession();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // 2. 認可チェック
    const hasPermission = await canSubmitProject(session.user.id, data.projectId);
    if (!hasPermission) {
      throw new Error("Forbidden: You do not have permission to submit this project");
    }

    // 3. 依存注入
    const deps = getDependencies();

    // 4. ユースケース実行
    const result = await submitProjectUseCase(deps, {
      projectId: data.projectId,
      userId: session.user.id as UserId,
    });

    // 5. Result → HTTPレスポンス変換
    if (Result.isFailure(result)) {
      const error = result.error;
      throw new Error(`[${error.code}] ${error.message}`);
    }

    return result.value;
  });
```

---

## データフロー

### Draft → Submission → Published のライフサイクル

```
┌─────────────────────────────────────────────────────┐
│  1. Draft編集 (Organization Member)                 │
│     ↓ editDraft serverFn                            │
│     └→ editDraftUseCase                             │
│         └→ ProjectRepository.saveDraft()            │
└─────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────┐
│  2. 提出 (Organization Manager)                     │
│     ↓ submitProject serverFn                        │
│     └→ submitProjectUseCase                         │
│         ├─ canSubmit(project)  ← ドメイン不変条件   │
│         ├─ createSubmissionFromDraft()              │
│         ├─ projectAfterSubmit()                     │
│         └→ ProjectRepository.saveSubmission()       │
└─────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────┐
│  3. 承認 (Approver/Admin)                           │
│     ↓ approveProject serverFn                       │
│     └→ approveProjectUseCase                        │
│         ├─ canApprove(submission)  ← ドメイン不変条件│
│         ├─ approveSubmission()                      │
│         ├─ createPublishedFromSubmission()          │
│         ├─ projectAfterApprove()                    │
│         └→ ProjectRepository.savePublished()        │
└─────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────┐
│  4. 公開データ利用                                  │
│     ├─ CSV/JSON出力 (Committee Member)             │
│     ├─ 公開Webサイト連携                            │
│     └─ 検索・フィルタ                               │
└─────────────────────────────────────────────────────┘
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

### 2. ユースケースのテスト

依存をモックして注入します。

```typescript
// application/project/submit-project.test.ts
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

### 3. Controller のテスト

認証・認可を含めた統合テスト。

```typescript
// controllers/project/submit-project.test.ts
import { describe, it, expect, vi } from "vitest";
import { submitProject } from "./submit-project";

describe("submitProject controller", () => {
  it("未認証の場合、エラー", async () => {
    // セッションをモック（未認証）
    vi.mock("@/libs/session-server", () => ({
      getSession: () => null,
    }));

    await expect(() => submitProject({ data: { projectId: "proj_123" } })).rejects.toThrow(
      "Unauthorized",
    );
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

| バージョン | 日付       | 変更内容                       |
| ---------- | ---------- | ------------------------------ |
| 1.0.0      | 2026-02-23 | 初版作成（アーキテクチャ確定） |
