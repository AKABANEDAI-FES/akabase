# 大学祭企画情報管理システム 基本設計書

---

## 1. アーキテクチャ概要

### 1.1 構成

- フロントエンド：SPA（React想定）
- バックエンド：Cloudflare Workers
- データベース：Cloudflare D1（SQLite）
- 画像ストレージ：Cloudflare R2
- 認証：Google OIDC

### 1.2 設計方針

- Domain-Driven Design（DDD）を採用
- 集約単位で整合性を担保
- ドメインロジックを中心に据え、DB構造は従属

---

## 2. コンテキスト設計

### 2.1 企画情報管理コンテキスト（Core）

- Project（企画）
- Organization（団体）
- Draft / Submission / Published
- Feedback（差戻しスレッド）

### 2.2 運営設定コンテキスト（Support）

- Event（年度）
- Tag / Place
- Deadline
- User / Role

---

## 3. 集約設計

### 3.1 Project（Aggregate Root）

#### 構造

- projectId
- eventId
- orgId
- name
- placeId（placesへの参照）
- logo

#### 内部モデル

- Draft（単一）
- Submission（複数：履歴）
- Published（単一）
- status
- feedbackThread

---

### 3.2 Draft

- pamphletText（120文字）
- webContentJson（TipTap）
- tags（複数）
- updatedAt
- updatedBy

---

### 3.3 Submission

- submissionId
- snapshot（Draftのコピー）
- status（Submitted / Returned / Approved / Withdrawn）
- submittedAt
- submittedBy
- decidedAt
- decidedBy

---

### 3.4 Published

- snapshot（Submissionのコピー）
- publishedAt
- publishedBy

---

### 3.5 Organization

- orgId
- eventId
- name
- description
- logo

#### 子要素

- members（userId + role）

---

### 3.6 Event

- eventId
- name
- slug
- status

#### 子要素

- tagCatalog
- placeCatalog
- deadlinePolicy

---

## 4. 不変条件（Invariant）

### Project

- Submitted状態のSubmissionは最大1つ
- Publishedは承認操作でのみ更新される
- Submissionは不変
- 取り下げは承認前のみ可能

### Organization

- managerのみメンバー管理可能

### Event

- アーカイブ後は変更不可

---

## 5. 状態遷移

### 状態

- Draft
- Submitted
- Returned
- Withdrawn
- Published

### 遷移

Draft → Submitted
Submitted → Returned
Submitted → Approved → Published
Submitted → Withdrawn

---

## 6. ユースケース設計

### 6.1 編集

EditProjectDraft(projectId, input, actor)

### 6.2 提出

SubmitProject(projectId, actor)

- DraftをコピーしてSubmission生成

### 6.3 差戻し

ReturnProject(projectId, message, actor)

- Submission.status = Returned

### 6.4 承認

ApproveProject(projectId, actor)

- Submission.status = Approved
- Published更新

### 6.5 取り下げ

WithdrawProject(projectId, actor)

- Submission.status = Withdrawn

---

## 7. データベース設計（DDL草案）

### events

- id (PK)
- name
- slug
- status

### organizations

- id (PK)
- event_id
- name
- description
- logo_key

### projects

- id (PK)
- event_id
- org_id
- name
- place_id (FK → places)
- logo_key

### project_drafts

- project_id (PK)
- pamphlet_text
- web_content_json
- updated_at
- updated_by

### project_submissions

- id (PK)
- project_id
- status
- pamphlet_text
- web_content_json
- submitted_at
- submitted_by
- decided_at
- decided_by

### project_published

- project_id (PK)
- pamphlet_text
- web_content_json
- published_at
- published_by

### tags

- id
- event_id
- name
- slug

### project_draft_tags

- project_id
- tag_id

### project_submission_tags

- submission_id
- tag_id

### project_published_tags

- project_id
- tag_id

### users

- id
- email
- sub

### org_members

- org_id
- user_id
- role

### committee_roles

- event_id
- user_id
- role

### deadlines

- id
- event_id
- field_key
- deadline_at

### feedback_threads

- id
- project_id

### feedback_messages

- id
- thread_id
- user_id
- message
- created_at

---

## 8. セキュリティ設計

- Google OIDC認証
- ロールベースアクセス制御（RBAC）
- Draft/Submission/Published単位でアクセス制御

---

## 10. 画像管理

- R2に保存
- 1MB制限
- key設計：
  - events/{eventId}/projects/{projectId}/...

---

## 11. 検索設計

- タグ
- 場所
- キーワード（全文検索用カラムを持つ）

---

## 12. 拡張ポイント

- Webhook（ドメインイベント）
- 公開API
- SSG連携

---
