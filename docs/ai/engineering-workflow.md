# Engineering workflow

Use this document for implementation, debugging, external integrations, or configuration work. `AGENTS.md` remains the canonical always-loaded entry point.

## Before editing

1. Read the target source, nearby tests, and relevant configuration.
2. Find one existing implementation of the same kind and follow its public shape unless the task intentionally changes the pattern.
3. Trace affected callers, imports, API consumers, persistence, and user-visible states.
4. State or record assumptions only when they are not already established by code or configuration.

Prefer a small, reversible change. Do not broaden the task merely because nearby cleanup is possible. If a discovered defect blocks the requested work, fix it; otherwise report it separately.

## TypeScript and React

- Keep strict types and handle `null` and `undefined` explicitly. Use `unknown` plus narrowing for untrusted values.
- Give shared data structures named types or interfaces. Avoid types that merely restate a local inferred shape.
- Keep functions and components focused. Prefer guard clauses to deep nesting, but do not create helpers that obscure a simple flow.
- Keep async work self-contained or pass required values explicitly. Do not assume a preceding state update has completed before another effect or callback runs.
- When state can be restored from a URL, storage, or direct navigation, test initialization independently of the navigation path that first created it.
- Use loading, empty, stale, and error states appropriate to real-time transit data.

## External API work

Do not design a parser from a prose description alone.

1. Prefer a documented structured API over DOM scraping. For an undocumented web application, inspect its network requests before considering HTML parsing.
2. Fetch an actual response when network access and authorization are available.
3. Inspect names, nesting, optional fields, content type, status behavior, and feed-specific extensions.
4. Store only sanitized, stable samples under `scripts/` when a fixture materially improves tests or future maintenance. Never commit credentials or unnecessary personal/live data.
5. Validate at the boundary with Zod, transform to application types, and test missing/unknown fields plus failure responses.

External services fail. Preserve timeouts, useful server-side diagnostics, user-safe errors, caching, and graceful fallback behavior.

## Debugging

- Reproduce the reported behavior before changing it when practical.
- Trace the actual path: UI state -> request -> route handler -> parser/service -> database or upstream response -> rendered result.
- Search for other consumers of the same field, endpoint, or transformation before fixing only one rendering path.
- Prefer root-cause fixes over duplicated guards. Do not turn a local bug fix into an unrequested redesign.
- Re-run the narrow failing check after each meaningful correction, then run the validation set required by `AGENTS.md`.

For user journeys, consider direct navigation, internal navigation, hard refresh, restored URL/local-storage state, and back/forward navigation when relevant.

## Database and configuration

- Prisma is the only ORM. Change `prisma/schema.prisma`, generate the client through the existing npm lifecycle, and use migrations for persisted schema changes.
- Ask before destructive or production data operations. Schema edits alone do not authorize applying them to a live database.
- JSX belongs in `.tsx` files, including test setup and Storybook decorators.
- Production TypeScript intentionally excludes tests, stories, and tool configuration; their own runners type/transform them.
- Storybook stories use types from `@storybook/nextjs-vite`, not the generic React renderer.
- Preserve `next.config.ts`'s Serwist/webpack build setup unless the task is specifically about changing it.

## Security and privacy

- Validate and constrain user-controlled input at route boundaries.
- Keep authentication and authorization checks server-side for personalized commute data.
- Use Prisma parameterization; do not introduce raw unsafe SQL for interpolated input.
- Never put secrets in client components, `NEXT_PUBLIC_*` variables, fixtures, logs, screenshots, or documentation.
- Do not scan home-directory credentials or unrelated configuration as a routine discovery step. Access only the minimum secret/configuration material explicitly required by the task.

## Documentation and completion

- Update the existing authoritative document when behavior or a public contract changes; do not create parallel notes.
- Comments should explain non-obvious intent or constraints, not restate code.
- A task is complete when the requested behavior is implemented and proportionately verified. Report unrun checks and known limitations plainly.
