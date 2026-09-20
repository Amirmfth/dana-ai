# Dana AI

Dana AI turns a learning goal into an AI-generated course with lessons, quizzes, tutor conversations, learner memory, progress tracking, and AI usage observability.

## Local setup

Required environment variables:

```bash
DATABASE_URL=
OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# Optional Phase 1 safety overrides.
AI_USER_DAILY_USD_LIMIT=2
AI_GLOBAL_DAILY_USD_LIMIT=20
```

Then:

```bash
npm install
npx prisma generate
npm run dev
```

## Authentication and authorization

Phase 1 uses Supabase Auth with email + password. Application data remains accessed from the server through Prisma, while Supabase Auth is the identity provider.

Course ownership is stored as the Supabase Auth user UUID. Server routes and actions enforce ownership even though Prisma connects with a privileged database connection.

Admin authorization uses the server-controlled Supabase `app_metadata.role` claim. User-editable `user_metadata` is never trusted for authorization.

To promote an account to admin after creating it, set its Auth app metadata to:

```json
{ "role": "admin" }
```

Use the Supabase Dashboard/Admin API for this operation. Do not put the role in user metadata.

## Database migration

The Phase 1 migration is:

```
prisma/migrations/20260920143000_phase1_security_auth/migration.sql
```

It intentionally removes the current application rows before adding mandatory ownership because the pre-Phase-1 data is test data.

Do **not** apply this migration to a deployment still running the pre-Phase-1 code. The schema and application branch must be released together.

The migration also enables RLS on all exposed application tables. Data API writes are denied by default; ownership-scoped read policies are provided, and server-side mutations continue through Prisma.

## AI safety

User-facing AI operations are protected by database-backed request windows plus daily per-user and global spend guards.

Default limits:

- Course generation: 5/user/hour, 25 globally/hour
- Lesson generation: 20/user/hour, 100 globally/hour
- Quiz generation: 30/user/hour, 150 globally/hour
- Tutor: 60/user/10 minutes, 300 globally/10 minutes
- Daily spend: $2/user, $20 globally unless overridden by environment variables

## AI payload privacy

Exact AI prompts and responses are **not stored by default**. Users can opt in from `/settings/privacy` and choose 7, 30, or 90 day retention. Operational metadata such as model, token counts, duration, and status remains available for usage controls and debugging.

## Validation

```bash
npm test
npm run lint
npm run build
```
