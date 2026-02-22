# 管理者権限設計書

---

## 1. 概要

本システムでは、**二層の権限管理構造**を採用する。

1. **システム全体の管理権限**（Better Auth Admin プラグイン）
2. **イベント単位の運営権限**（`committee_roles` テーブル）

この設計により、システム管理者とイベント運営委員の役割を明確に分離し、適切な権限委譲を実現する。

---

## 2. 背景・課題

### 2.1 設計上の問題

既存の `committee_roles` テーブルはイベント単位で権限を管理するが、以下の操作はイベントに紐付かない：

- 新規イベントの作成
- システム全体の設定変更
- 全イベント横断的な管理操作

これにより「イベントを作成するには権限が必要だが、権限はイベントに紐付く」という循環参照が発生する。

### 2.2 解決方針

Better Auth の公式 Admin プラグインを導入し、イベント非依存の**システム管理者**概念を実装する。

---

## 3. 権限の二層構造

### 3.1 レイヤー1: システム管理者（Better Auth Admin）

**対象範囲**: システム全体

**役割**:

- 新規イベントの作成・削除
- システム設定の変更
- 全イベントへのアクセス権限
- ユーザー管理（バン、ロール変更など）
- イベント運営委員への権限付与

**実装方法**: Better Auth の Admin プラグイン

### 3.2 レイヤー2: イベント運営委員（committee_roles）

**対象範囲**: 特定イベント内

**役割の種類**:

| ロール     | 説明           | 主な権限                                                      |
| ---------- | -------------- | ------------------------------------------------------------- |
| `admin`    | イベント管理者 | イベント設定変更、タグ/場所管理、締切設定、委員管理、企画承認 |
| `approver` | 承認者         | 企画の承認・差戻し、フィードバック                            |
| `member`   | 一般委員       | 企画の閲覧、フィードバック                                    |
| `default`  | 一般ユーザー   | 自分の所属団体の企画のみ操作可能                              |

**実装方法**: `committee_roles` テーブル

---

## 4. Better Auth Admin プラグインの詳細

### 4.1 提供機能

- **ユーザー管理**: 作成、更新、削除
- **ロール管理**: ユーザーロールの変更
- **アカウント制御**: バン/アンバン機能
- **セッション管理**: セッション一覧、取消
- **なりすまし**: 管理者が特定ユーザーとしてログイン（最大1時間）

### 4.2 データベーススキーマへの影響

#### `user` テーブルへの追加フィールド

```sql
ALTER TABLE user ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE user ADD COLUMN banned INTEGER NOT NULL DEFAULT 0;  -- boolean
ALTER TABLE user ADD COLUMN ban_reason TEXT;
ALTER TABLE user ADD COLUMN ban_expires INTEGER;  -- timestamp_ms
```

#### `session` テーブルへの追加フィールド

```sql
ALTER TABLE session ADD COLUMN impersonated_by TEXT;  -- user_id
```

### 4.3 設定オプション（`auth.ts`）

```typescript
import { admin } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    admin({
      defaultRole: "user", // 新規ユーザーのデフォルトロール
      adminUserIds: getAdminUserIds(), // 初期管理者のユーザーID配列
      impersonationSessionDuration: 3600, // なりすまし期間（秒）
      allowImpersonatingAdmins: false, // 管理者同士のなりすまし禁止
    }),
    // ...
  ],
  // ...
});
```

### 4.4 初期管理者の設定方法

#### 方法1: 環境変数でメールアドレス指定（推奨）

```bash
# .dev.vars
ADMIN_EMAILS=admin1@toyo.jp,admin2@toyo.jp
```

```typescript
// auth.ts
function getAdminUserIds(): string[] {
  const adminEmails = env.ADMIN_EMAILS?.split(",") || [];

  // ログイン時にメールアドレスでマッチング
  // 実際の実装ではユーザーIDに変換する処理が必要
  return [];
}
```

#### 方法2: ユーザーID直接指定

```bash
# .dev.vars
ADMIN_USER_IDS=user_abc123,user_def456
```

```typescript
function getAdminUserIds(): string[] {
  return env.ADMIN_USER_IDS?.split(",") || [];
}
```

#### 方法3: 初回ログイン時の自動付与

```typescript
databaseHooks: {
  user: {
    create: {
      after: async (user) => {
        const adminEmails = env.ADMIN_EMAILS?.split(',') || [];
        if (adminEmails.includes(user.email)) {
          await db.update(userTable)
            .set({ role: 'admin' })
            .where(eq(userTable.id, user.id));
        }
      },
    },
  },
}
```

---

## 5. committeeRoles テーブルの詳細

### 5.1 スキーマ

```sql
CREATE TABLE committee_roles (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('admin', 'approver', 'member', 'default')),
  created_at INTEGER NOT NULL,
  UNIQUE(event_id, user_id)
);

CREATE INDEX committee_roles_event_id_idx ON committee_roles(event_id);
CREATE INDEX committee_roles_user_id_idx ON committee_roles(user_id);
```

### 5.2 ロール別権限マトリックス

| 操作               | admin | approver | member | default |
| ------------------ | ----- | -------- | ------ | ------- |
| イベント設定変更   | ✓     | -        | -      | -       |
| タグ/場所管理      | ✓     | -        | -      | -       |
| 締切設定           | ✓     | -        | -      | -       |
| 委員管理           | ✓     | -        | -      | -       |
| 企画承認           | ✓     | ✓        | -      | -       |
| 企画差戻し         | ✓     | ✓        | -      | -       |
| 全企画閲覧         | ✓     | ✓        | ✓      | -       |
| フィードバック投稿 | ✓     | ✓        | ✓      | -       |
| 自団体企画編集     | ✓     | ✓        | ✓      | ✓       |

### 5.3 権限チェックの実装例

```typescript
async function hasEventPermission(
  userId: string,
  eventId: string,
  requiredRole: "admin" | "approver" | "member",
): Promise<boolean> {
  const role = await db
    .select()
    .from(committeeRoles)
    .where(and(eq(committeeRoles.userId, userId), eq(committeeRoles.eventId, eventId)))
    .get();

  if (!role) return false;

  const roleHierarchy = { admin: 3, approver: 2, member: 1, default: 0 };
  return roleHierarchy[role.role] >= roleHierarchy[requiredRole];
}
```

---

## 6. 権限チェックのフロー

### 6.1 イベント作成時

```
1. ユーザーがログイン済みか確認
2. Better Auth の user.role === 'admin' をチェック
3. admin の場合のみイベント作成を許可
```

### 6.2 イベント管理画面アクセス時

```
1. ユーザーがログイン済みか確認
2. Better Auth の user.role === 'admin' OR
   committee_roles で当該イベントの admin ロールを保持
3. いずれかを満たす場合のみアクセス許可
```

### 6.3 企画承認時

```
1. ユーザーがログイン済みか確認
2. Better Auth の user.role === 'admin' OR
   committee_roles で当該イベントの admin/approver ロールを保持
3. いずれかを満たす場合のみ承認操作を許可
```

### 6.4 権限チェックのヘルパー関数

```typescript
async function canAccessEventAdmin(userId: string, eventId: string): Promise<boolean> {
  // システム管理者は全イベントにアクセス可能
  const user = await db.select().from(userTable).where(eq(userTable.id, userId)).get();
  if (user?.role === "admin") return true;

  // イベント管理者権限をチェック
  return await hasEventPermission(userId, eventId, "admin");
}

async function canApproveProject(userId: string, eventId: string): Promise<boolean> {
  const user = await db.select().from(userTable).where(eq(userTable.id, userId)).get();
  if (user?.role === "admin") return true;

  return await hasEventPermission(userId, eventId, "approver");
}
```

---

## 7. ルーティング設計

### 7.1 管理画面のルート構造

```
/admin                          # システム管理画面（Better Auth admin のみ）
  /events                       # イベント一覧・作成
  /users                        # ユーザー管理

/:eventSlug/admin        # イベント管理画面（admin/approver）
  /settings                     # イベント設定
  /tags                         # タグ管理
  /places                       # 場所管理
  /deadlines                    # 締切管理
  /committee                    # 委員管理
  /projects                     # 企画一覧・承認
```

### 7.2 ルートガード実装例

```typescript
// routes/admin/index.tsx（システム管理）
export const Route = createFileRoute("/admin/")({
  beforeLoad: async ({ context }) => {
    const session = await auth.api.getSession({ headers: context.request.headers });
    if (!session?.user || session.user.role !== "admin") {
      throw redirect({ to: "/", statusCode: 403 });
    }
  },
});

// routes/$eventSlug/admin/index.tsx（イベント管理）
export const Route = createFileRoute("/$eventSlug/admin/")({
  beforeLoad: async ({ context, params }) => {
    const session = await auth.api.getSession({ headers: context.request.headers });
    if (!session?.user) throw redirect({ to: "/login" });

    const event = await getEventBySlug(params.eventSlug);
    const canAccess = await canAccessEventAdmin(session.user.id, event.id);

    if (!canAccess) {
      throw redirect({ to: `/${params.eventSlug}`, statusCode: 403 });
    }
  },
});
```

---

## 8. 実装手順

### 8.1 Better Auth Admin プラグインのセットアップ

1. **プラグインのインストール**（すでに `better-auth` に含まれている）

2. **`src/libs/auth.ts` の更新**

```typescript
import { admin } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    tanstackStartCookies(),
    admin({
      defaultRole: "user",
      adminUserIds: env.ADMIN_USER_IDS?.split(",") || [],
    }),
  ],
  // ...既存の設定
});
```

3. **`src/db/auth-schema.ts` の更新**

```typescript
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
  image: text("image"),
  role: text("role").notNull().default("user"),
  banned: integer("banned", { mode: "boolean" }).notNull().default(false),
  banReason: text("ban_reason"),
  banExpires: integer("ban_expires", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = sqliteTable("session", {
  // ...既存のフィールド
  impersonatedBy: text("impersonated_by"),
});
```

4. **マイグレーション生成・適用**

```bash
pnpm migration
pnpm migrate
```

5. **クライアント側の設定**（必要に応じて）

```typescript
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [adminClient()],
});
```

6. **環境変数の設定**

```bash
# .dev.vars
ADMIN_USER_IDS=  # 初回は空、ログイン後にユーザーIDを設定
# または
ADMIN_EMAILS=your-admin@toyo.jp
```

### 8.2 初回セットアップ手順

1. システムを起動
2. 管理者となるユーザーでログイン
3. ユーザーIDを確認（データベースまたはログ）
4. 環境変数 `ADMIN_USER_IDS` に追加
5. システム再起動
6. 管理画面にアクセス可能になる

### 8.3 委員会メンバーの追加

システム管理者またはイベント管理者が、イベント管理画面から：

1. ユーザーを検索（メールアドレスまたは名前）
2. ロールを選択（admin / approver / member）
3. 追加ボタンをクリック
4. `committee_roles` テーブルにレコードが作成される

---

## 9. セキュリティ考慮事項

### 9.1 権限昇格の防止

- 一般ユーザーが自分でロールを変更できないようにする
- Admin API エンドポイントは必ず権限チェックを実施
- クライアント側のロール表示は信頼せず、サーバー側で再検証

### 9.2 なりすまし機能の制限

- `allowImpersonatingAdmins: false` で管理者同士のなりすまし禁止
- なりすましセッションは最大1時間で自動失効
- なりすまし中は UI に明確な表示を行う

### 9.3 監査ログ

将来的に以下を記録することを推奨：

- 管理者による権限変更操作
- なりすまし操作の開始・終了
- システム設定の変更履歴

---

## 10. 参考リンク

- [Better Auth - Admin Plugin](https://www.better-auth.com/docs/plugins/admin)
- [Better Auth - Access Control](https://www.better-auth.com/docs/plugins/access-control)

---
