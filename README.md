# NidanaSetu

AI-assisted diagnostic interpretation portal for doctors. Doctors upload
diagnostic reports, get an AI-generated draft interpretation, and must
explicitly review and sign off before it's treated as final. This is a
clinical decision-support tool, not a patient-facing diagnostic app — every
AI output is a draft for physician review.

**Phase 0 scope**: full working flow for the **lab reports module only**
(intake gate → upload → AI draft → doctor review/sign-off → audit log).
ECG, imaging, and prescriptions are stubbed (routes/pages exist, DB tables
exist, no generation logic yet).

## Stack

Next.js (App Router) + TypeScript, Supabase (Postgres/Auth/Storage),
Tailwind CSS, Anthropic API (`claude-sonnet-5` for both text and vision).

## Product rules enforced server-side

- **Intake gate**: `POST /api/interpretations/generate` rejects (403) any
  report whose case doesn't have a completed `intake_records` row, even if
  called directly (not just a disabled UI button).
- **Disclaimer + audit**: every view of `/interpretations/[id]/review` logs
  a `disclaimer_displayed` audit row before rendering. Upload, generation,
  and sign-off are also logged. `audit_log` has no update/delete grants —
  it's structurally append-only.
- **Draft vs. final**: `interpretations.ai_draft` (AI output, immutable
  once generated) and `interpretations.doctor_final` (doctor-edited, set
  only at sign-off) are stored separately. `status` only flips to
  `signed_off` via the explicit sign-off action, which also records
  `signed_off_by` and `signed_off_at`.

## Local development

```bash
npm install
npm run dev
```

Requires `.env.local` (gitignored, not committed) with:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_URL=       # direct Postgres connection string, used only by scripts/*.ts
ANTHROPIC_API_KEY=
```

See `.env.local.example` for the full list.

## Migrations

No Supabase CLI dependency — migrations run via a small script against
`SUPABASE_DB_URL`:

```bash
npx tsx scripts/run-migration.ts supabase/migrations/000X_description.sql
```

Migrations live in `supabase/migrations/`, numbered sequentially. Current:
`0001_init_schema.sql` (tables, RLS helpers, RLS policies),
`0002_storage.sql` (private `report-files` bucket + storage RLS).

## Future MyVaidya integration

`patients.external_patient_ref` is a nullable, currently-unused column
reserved for mapping to MyVaidya's patient records later. Read-only routes
under `/api/v1/*` (`cases`, `cases/[id]`, `reports/[id]`,
`interpretations/[id]`) are the intended integration surface — currently
gated by the doctor's own session; a dedicated API-key auth layer for an
external MyVaidya consumer is deliberately deferred until that consumer
exists to build and test against.
