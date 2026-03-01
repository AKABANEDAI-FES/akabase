# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

University festival event management system built on Cloudflare Workers. Manages event projects through a Draft → Submission → Published workflow with approval processes. Implements Domain-Driven Design (DDD) principles with the Project aggregate as the core.

**Tech Stack:**

- **Frontend:** React 19 + TanStack Start (SSR), Panda CSS for styling
- **UI Components:** Park UI (built on Ark UI, integrated with Panda CSS)
- **Backend:** Cloudflare Workers (edge runtime)
- **Database:** Cloudflare D1 (SQLite) via Drizzle ORM
- **Storage:** Cloudflare R2 (for images)
- **Auth:** Better Auth with Google OIDC (toyo.jp domain restriction)
- **Routing:** TanStack Router (file-based)
- **State:** TanStack Query for server state
- **Testing:** Vitest
- **Linting:** oxlint + oxfmt (not ESLint/Prettier)

## Common Commands

### Development

```bash
pnpm dev              # Start local dev server with Wrangler
pnpm build            # Production build
pnpm preview          # Preview production build
```

### Database

```bash
pnpm migration        # Generate migrations from schema (drizzle-kit generate)
pnpm migrate          # Apply migrations to local D1 database
pnpm cf-typegen       # Generate TypeScript types for Cloudflare bindings
```

### Code Quality

```bash
pnpm test             # Run all tests with Vitest
pnpm lint             # Lint with oxlint
pnpm format           # Format with oxfmt
pnpm check            # Lint + format check (both)
pnpm check:fix        # Auto-fix linting and formatting issues
```

### Styling

```bash
pnpm prepare          # Generate Panda CSS (runs before dev/build)
```

## Architecture

### Domain-Driven Design Structure

The codebase follows DDD principles with bounded contexts:

1. **Event Management Context** (`Event` aggregate)
   - Manages event configuration identified by slug (typically year-based like "2025")
   - Contains tags, places, deadlines
   - Enforces data isolation per event (typically by year)
   - Archived events are read-only

2. **Project Management Context** (`Project` aggregate - core)
   - **Draft:** Editable working data
   - **Submission:** Immutable snapshot when submitted (states: Submitted/Returned/Approved/Withdrawn)
   - **Published:** Current approved public data
   - **SubmissionActions:** All actions (submitted, approved, returned, withdrawn) recorded in unified table
   - **SubmissionMessages:** Feedback messages and comments, optionally linked to specific actions
   - **Invariants:**
     - Only one active submission allowed at a time
     - Submissions are immutable after creation (content cannot be modified)
     - Draft changes don't affect Published until approved
     - Approvals are recorded as actions (actionType: "approved") in submission_actions table
     - Same user cannot approve twice on the same submission
     - Approvals can only be added/removed when status is 'submitted'
     - When approval count reaches required number (1), status automatically changes to 'approved' and Published is updated
     - Once status becomes 'approved', approvals cannot be removed and submission cannot be returned or withdrawn
     - Approval removal is physical deletion (DELETE) from submission_actions table
     - Withdrawal only allowed before approval (status must be 'submitted')

3. **Organization Context** (`Organization` aggregate)
   - Organization info and member management
   - Only managers can manage members

### Key Architectural Decisions

**State Transitions:**

```
Draft → [Submit] → Submission (status: submitted)
                → submission_actions += {actionType: "submitted"}
                ↓
             [Approval Actions Added] (submission_actions table)
                → submission_actions += {actionType: "approved", userId: approver}
                ↓
             When COUNT(actionType='approved') >= REQUIRED_APPROVALS (1):
                → status = 'approved' (automatic)
                → project_published table updated

From 'submitted' state only:
                → [Return] → status = 'returned'
                          → submission_actions += {actionType: "returned"}
                          → back to Draft editing

                → [Withdraw] → status = 'withdrawn'
                            → submission_actions += {actionType: "withdrawn"}

                → [Remove Approval] → DELETE from submission_actions
                                   → If count < required: revert to 'submitted'

Note: Return, Withdraw, and Approval removal only allowed when status = 'submitted'
Once status = 'approved', it becomes immutable (no return, no withdrawal, no approval removal)
```

**Database Schema:**

- `projects`: Core project metadata
- `project_drafts`: Current editable version
- `project_submissions`: Historical submission snapshots (status field only, no decidedAt/decidedBy)
- `submission_actions`: All actions (submitted, approved, returned, withdrawn) with userId and timestamp
- `submission_messages`: Feedback messages and comments, optionally linked to specific actions
- `project_published`: Current public version
- Auth tables: `user`, `session`, `account`, `verification` (Better Auth schema)

**Approval Flow:**

1. Multiple committee members (role: admin or approver) can add approvals to a submission by creating action records
2. Required approval count is hardcoded: `REQUIRED_APPROVALS = 1` (defined in `src/domain/project/schema.ts`)
3. Approval is recorded as: `submission_actions += {actionType: "approved", userId: approver, submissionId: ...}`
4. When `COUNT(actionType='approved') >= REQUIRED_APPROVALS`, the submission automatically transitions to 'approved' status and Published is updated
5. Approvals can only be added/removed when `submission.status = 'submitted'`
6. Approval removal is physical deletion: `DELETE FROM submission_actions WHERE id = ?`
7. Approval removal permissions:
   - Committee admin: can remove any approval
   - Approver who added the approval: can remove their own approval only
8. If approval is removed and count falls below required threshold, automatically revert: status → 'submitted', delete Published
9. Once status becomes 'approved', no changes are allowed (immutable)

### CQRS Pattern (Command Query Responsibility Segregation)

The application layer is split into **Command** (write) and **Query** (read) to optimize each separately:

**Command** (`application/command/`):

- Handles state changes (Create, Update, Delete)
- Uses Repository pattern for persistence
- Enforces domain invariants and business rules
- Returns domain models
- Used in route `action` functions

**Query** (`application/query/`):

- Handles data retrieval for display (Read)
- Database access via `deps: Pick<Dependencies, "db" | ...>` (same DI pattern as Command)
- Can JOIN across aggregates for optimized reads
- Returns DTOs (Data Transfer Objects) defined with zod schemas
- DTOs are defined in the same file as query functions (no separate `types.ts`)
- Used in route `loader` functions

**Example**:

```typescript
// application/query/event/list-events.ts
import { z } from "zod";

// DTO schema (zod)
export const eventListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  projectCount: z.number(), // Joined from projects table
});

// Type derived from schema
export type EventListItem = z.infer<typeof eventListItemSchema>;

// Query function (receives deps via DI)
export async function listEvents(
  deps: Pick<Dependencies, "db">,
): Promise<Result<EventListItem[], QueryError>> {
  // DB access via deps
  const rows = await deps.db
    .select({
      /* ... */
    })
    .from(events)
    .leftJoin(projects, eq(events.id, projects.eventId));

  return Result.succeed(rows.map((row) => eventListItemSchema.parse(row)));
}
```

### Directory Structure

```
src/
├── application/
│   ├── command/         # Write operations (Use Cases)
│   │   ├── project/
│   │   │   ├── submit-project.ts
│   │   │   └── approve-project.ts
│   │   └── event/
│   │       └── create-event.ts
│   └── query/           # Read operations (DTOs + Query functions)
│       ├── event/
│       │   └── list-events.ts    # DTO schema + query function
│       └── project/
│           └── get-project-detail.ts
├── domain/              # Domain models, logic, errors
│   ├── project/
│   │   ├── schema.ts    # Zod schemas + types
│   │   ├── logic.ts     # Pure business logic
│   │   └── errors.ts    # Error types
│   └── event/
│       └── schema.ts
├── infrastructure/
│   ├── repositories/    # Repository implementations
│   │   ├── interfaces.ts
│   │   └── project-repository.ts
│   └── di.ts            # Dependency injection
├── routes/              # TanStack Router file-based routes
│   ├── __root.tsx       # Layout wrapper with <Outlet />
│   └── index.tsx        # Individual route files
├── db/
│   ├── schema.ts        # Drizzle schema (re-exports auth-schema)
│   ├── auth-schema.ts   # Better Auth database tables
│   └── index.ts         # Database client initialization
├── libs/
│   ├── auth.ts          # Better Auth configuration
│   └── result.ts        # Result type utilities (with tests)
├── integrations/
│   └── tanstack-query/
│       ├── root-provider.tsx  # QueryClient setup
│       └── devtools.tsx       # Query devtools
└── router.tsx           # Router creation with SSR-Query integration
```

### Routing

- **File-based routing:** Add files to `src/routes/` to create routes
- **Auto-generation:** TanStack Router generates route tree in `routeTree.gen.ts`
- **SSR Integration:** Router integrates with TanStack Query for SSR data fetching
- **Loaders:** Use route `loader` functions for data fetching before render

### Styling with Panda CSS

- Utility-first CSS-in-JS framework
- Run `pnpm prepare` to generate `styled-system/` directory
- Import utilities from `styled-system/`
- Config: `panda.config.ts`

### UI Components with Park UI

- Park UI is a component library built on top of Ark UI (headless components) and Panda CSS
- Components are copied directly into your project (not installed as npm package)
- Use Park UI CLI to add components: `pnpm dlx @park-ui/cli`
- Component recipes and styles are defined in `src/theme/recipes/`
- Built on Ark UI (`@ark-ui/react`) which provides headless, accessible components
- Customizable via Panda CSS tokens and recipes
- All components are fully typed with TypeScript

### Database Access

- Use `db` instance from `@/db` (exported from `src/db/index.ts`)
- Schema defined in `src/db/schema.ts`
- Drizzle ORM with typed queries
- Local dev uses Wrangler D1 emulation (`.wrangler/state/v3/d1/`)
- Always generate migrations for schema changes: `pnpm migration`

### Authentication

- Better Auth with Google OIDC provider
- Domain restriction: `@toyo.jp` emails only
- Email verification required for new users
- Auth instance: `src/libs/auth.ts`
- Database adapter: Drizzle with SQLite

### Environment Variables

Configure in `.dev.vars` for local development and Cloudflare dashboard for production:

- `BETTER_AUTH_SECRET`: Auth session secret
- `BETTER_AUTH_URL`: Base URL for auth callbacks
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret

### Cloudflare Bindings

Access via `env` from `cloudflare:workers`:

```typescript
import { env } from "cloudflare:workers";

const db = env.DB; // D1 database
```

## Development Guidelines

### When to Use Command vs Query

**Use Command** (`application/command/`):

- Data mutations (Create, Update, Delete)
- Business rule validation required
- Domain invariants must be enforced
- Transaction boundaries needed
- Called from route `action` functions

**Use Query** (`application/query/`):

- Read-only data retrieval
- Display/UI data needs
- Statistics or aggregated data
- Need to JOIN across multiple aggregates
- Called from route `loader` functions

### When Adding Routes

1. Create file in `src/routes/`
2. TanStack Router will auto-generate route configuration
3. Use `loader` for data fetching (call Query functions)
4. Use `action` for mutations (call Command use cases)
5. Use `createRoute()` or file-based conventions

### When Modifying Database Schema

1. Edit `src/db/schema.ts` or `src/db/auth-schema.ts`
2. Run `pnpm migration` to generate migration files
3. Run `pnpm migrate` to apply to local D1 database
4. For production, use `wrangler d1 migrations apply archive --remote`

### When Writing Queries

1. Create file in `application/query/<context>/` (e.g., `application/query/event/list-events.ts`)
2. Define DTO schema with zod in the same file:
   ```typescript
   export const eventListItemSchema = z.object({
     id: z.string(),
     name: z.string(),
     projectCount: z.number(),
   });
   export type EventListItem = z.infer<typeof eventListItemSchema>;
   ```
3. Implement query function with deps parameter (DB access via DI):
   ```typescript
   export async function listEvents(
     deps: Pick<Dependencies, "db">,
   ): Promise<Result<EventListItem[], QueryError>> {
     const rows = await deps.db.select({ /* ... */ }).from(events).leftJoin(projects, ...);
     return Result.succeed(rows.map(row => eventListItemSchema.parse(row)));
   }
   ```
4. Use in route `loader` (pass `dependencies` from DI):
   ```typescript
   const loadEventsFn = createServerFn({ method: "GET" }).handler(async () => {
     const result = await listEvents(dependencies);
     if (Result.isFailure(result)) throw new Error(result.error.message);
     return result.value;
   });
   ```

### When Writing Commands (Use Cases)

1. Create file in `application/command/<context>/` (e.g., `application/command/project/submit-project.ts`)
2. Define Input/Output types
3. Accept dependencies via DI (first parameter)
4. Use Repository pattern for persistence
5. Delegate to domain logic for business rules:
   ```typescript
   export const submitProject = (deps: Dependencies, input: SubmitProjectInput) => {
     return gen(async function* ($) {
       const project = yield* $(await deps.projectRepo.findById(input.projectId));
       yield* $(canSubmit(project)); // Domain logic
       const submission = createSubmissionFromDraft(draft, userId, submissionId);
       yield* $(await deps.projectRepo.saveSubmission(submission));
       return { submissionId };
     });
   };
   ```
6. Use in route `action`:
   ```typescript
   const submitProjectFn = createServerFn({ method: "POST" }).handler(async ({ data }) => {
     const result = await submitProject(dependencies, data);
     if (Result.isFailure(result)) throw new Error(result.error.message);
     return result.value;
   });
   ```

### When Writing Tests

- テスト名は日本語で書く
- テストファイルはソースファイルと同じディレクトリに配置（e.g., `create-event.test.ts`）
- テストヘルパーは `src/test/` に配置

**テストDB:**

`createTestDb()` でインメモリSQLiteを使用。マイグレーションが自動適用される。

```typescript
import { createTestDb } from "@/test/db-mock";

let testDb: ReturnType<typeof createTestDb>;

beforeEach(() => {
  testDb = createTestDb();
});

afterEach(() => {
  testDb.cleanup();
});
```

**Commandテスト:**

`createTestDependencies(db)` で実際のリポジトリを含む依存関係を構築。モックではなく実DBで統合テスト。

```typescript
import { createTestDependencies } from "@/test/test-dependencies";
import { createAdminActor, createUserActor } from "@/test/test-helpers";

const deps = createTestDependencies(testDb.db);
const actor = createAdminActor();
const result = await createEvent(deps, { name: "Event", slug: "2025", actor });

expect(Result.isSuccess(result)).toBe(true);
```

**Queryテスト:**

`testDb.db` を直接渡す。テストデータは `testDb.db.insert()` で投入。

```typescript
await testDb.db.insert(events).values({ id: "event-1", slug: "2025", ... });
const result = await listEvents({ db: testDb.db });
```

**テストカバレッジの方針:**

- Command: 認可（成功/失敗）、ドメインルール違反、バリデーションエラー、正常系を網羅
- Query: 0件、複数件、ソート順、DTOの形状を確認

### Code Quality Tools

- **oxlint** (not ESLint): Fast Rust-based linter
- **oxfmt** (not Prettier): Fast Rust-based formatter
- Config: `.oxlintrc.json`, `.oxfmtrc.json`
- Use `pnpm check:fix` to auto-fix issues

### React Compiler

- Babel plugin enabled: `babel-plugin-react-compiler`
- Configured in `vite.config.ts`
- Automatically optimizes React components

## Important Constraints

1. **Google Auth Domain:** Only `@toyo.jp` emails allowed
2. **One Active Submission:** Project aggregate enforces single active submission
3. **Submission Immutability:** Submissions cannot be modified after creation
4. **Event Isolation:** Data is strictly separated by event slug (typically year-based)
5. **Deadline Enforcement:** Field-level deadlines prevent editing after cutoff (admin can override)

## References

- Requirements: `docs/requirements.md` (Japanese)
- Design: `docs/design.md` (Japanese, DDD-based)
- Architecture: `docs/architecture.md` (Japanese, technical details)
- TanStack Start: https://tanstack.com/start
- Better Auth: https://better-auth.com
- Drizzle ORM: https://orm.drizzle.team
- Panda CSS: https://panda-css.com
- Park UI: https://park-ui.com
- Ark UI: https://ark-ui.com
