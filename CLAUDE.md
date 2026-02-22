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
   - **Invariants:**
     - Only one active submission allowed at a time
     - Submissions are immutable after creation
     - Draft changes don't affect Published until approved
     - Withdrawal only allowed before approval

3. **Organization Context** (`Organization` aggregate)
   - Organization info and member management
   - Only managers can manage members

### Key Architectural Decisions

**State Transitions:**

```
Draft → [Submit] → Submission (Submitted)
                → [Return] → Submission (Returned) → back to Draft editing
                → [Approve] → Submission (Approved) + Published updated
                → [Withdraw] → Submission (Withdrawn)
```

**Database Schema:**

- `projects`: Core project metadata
- `project_drafts`: Current editable version
- `project_submissions`: Historical submission snapshots
- `project_published`: Current public version
- Auth tables: `user`, `session`, `account`, `verification` (Better Auth schema)

### Directory Structure

```
src/
├── routes/          # TanStack Router file-based routes
│   ├── __root.tsx   # Layout wrapper with <Outlet />
│   └── index.tsx    # Individual route files
├── db/
│   ├── schema.ts    # Drizzle schema (re-exports auth-schema)
│   ├── auth-schema.ts # Better Auth database tables
│   └── index.ts     # Database client initialization
├── libs/
│   ├── auth.ts      # Better Auth configuration
│   └── result.ts    # Result type utilities (with tests)
├── integrations/
│   └── tanstack-query/
│       ├── root-provider.tsx  # QueryClient setup
│       └── devtools.tsx       # Query devtools
└── router.tsx       # Router creation with SSR-Query integration
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

### When Adding Routes

1. Create file in `src/routes/`
2. TanStack Router will auto-generate route configuration
3. Use `loader` for data fetching before render
4. Use `createRoute()` or file-based conventions

### When Modifying Database Schema

1. Edit `src/db/schema.ts` or `src/db/auth-schema.ts`
2. Run `pnpm migration` to generate migration files
3. Run `pnpm migrate` to apply to local D1 database
4. For production, use `wrangler d1 migrations apply archive --remote`

### When Writing Tests

- Tests live alongside source files (e.g., `result.test.ts`)
- Use Vitest with React Testing Library
- JSDOM environment configured for React components

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
- TanStack Start: https://tanstack.com/start
- Better Auth: https://better-auth.com
- Drizzle ORM: https://orm.drizzle.team
- Panda CSS: https://panda-css.com
- Park UI: https://park-ui.com
- Ark UI: https://ark-ui.com
