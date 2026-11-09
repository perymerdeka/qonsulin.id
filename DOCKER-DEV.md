# Development with Docker

## Start

Requirements: Docker Desktop running and Node.js/pnpm available on the host for Supabase CLI.

```powershell
pnpm run docker:up
```

The script starts Supabase Local, reads its generated local-only keys, writes the ignored `.env.docker.local`, and starts the Next.js container.

- Web app: http://localhost:3000
- Supabase Studio: http://localhost:54323
- Mailpit (local auth email inbox): http://localhost:54324
- Local Supabase API: http://localhost:54321

Default local admin credentials are defined by the script: `halo@qonsulin.id` / `adminqonsulin123`. These are development-only; never reuse them in production.

## Stop

```powershell
docker compose down
pnpm run supabase:local:stop
```

## Reset local database

```powershell
pnpm run supabase:local:reset
```

This is destructive to the local database only. It recreates local PostgreSQL from `supabase/migrations/` and `supabase/seed.sql`. It does not connect to or modify a remote Supabase project.

## Database changes

Create migrations with `pnpm exec supabase migration new <name>`. Keep schema changes in ordered migration files. Run and test them locally before considering any staging or production rollout. Do not run `supabase link`, `supabase db push`, or `pnpm run sync:live:push` as part of local development.

`20261105050650_baseline_cms_local.sql` is a local baseline copied from the repo's existing `supabase/schema.sql`; it is only for the local Docker database. Review and replace/refactor that baseline before using it as a production migration. Existing CMS sample content is seeded locally; never use real member letters or personal data in local seeds.
