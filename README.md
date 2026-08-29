# LifeOS

Personal operating system — V1 scope: Health/Medical domain, built on a
multi-tenant, bilingual (EN/FR) Core. Full product spec:
`LifeOS_Master_Technical_Product_Specification_V1.2.docx`.

This is the **Phase 0 (Architecture) scaffold** per Spec Section 40 —
repo structure, database schema, auth, i18n, and design tokens are in
place. Phase 1 (Health Foundation UI) is the next step.

## Stack

Next.js + TypeScript · Supabase (Postgres, Auth, Storage, RLS) · Tailwind
+ shadcn/ui · next-intl (EN/FR) · Zod · Recharts

## Setup

1. **Create a Supabase project** at supabase.com if you haven't already.
2. **Install dependencies:**
   ```
   npm install
   ```
3. **Environment variables:** copy `.env.local.example` to `.env.local`
   and fill in your Supabase project URL and anon key (Project Settings
   → API in the Supabase dashboard).
4. **Run migrations** against your Supabase project, in order:
   ```
   supabase link --project-ref your-project-ref
   supabase db push
   ```
   This applies everything in `supabase/migrations/` — Core tables,
   Health tables, timeline/audit, and the private storage bucket.
5. **Seed lab test definitions:**
   ```
   supabase db execute -f supabase/seed.sql
   ```
6. **Enable 2FA** in Supabase Auth settings (Authentication → Providers
   → Enable MFA) — recommended per Spec Section 6.2 given the
   sensitivity of the data this app holds.
7. **Run locally:**
   ```
   npm run dev
   ```

## What's scaffolded vs. what's next

**In place (Phase 0):**
- Full Core + Health database schema with RLS on every table (`supabase/migrations/`)
- Trigger-based integrity check for the timeline's polymorphic reference (`0003_audit_and_timeline.sql`) — see inline comments for why this needed a documented decision rather than a plain FK
- Audit event logging via a security-definer function (insert-only from the client)
- Private, per-user storage bucket for medical documents
- Core + Health TypeScript types (`src/types/`)
- Supabase client setup for both browser and server contexts, with session refresh middleware
- EN/FR locale scaffolding and a starter string set
- Design tokens wired into Tailwind (`tailwind.config.ts`) — brand colors and semantic status colors, sourced from spec Section 51.4
- App icon assets (`public/icons/`)
- One complete vertical slice (Conditions: types → Zod validation → service layer → API route) as the pattern to copy for every other Health sub-area

**Not yet built (Phase 1 onward):**
- Auth pages (login/signup) — folder scaffolded at `src/app/[locale]/(auth)/`, empty
- Remaining Health UI pages (labs, medications, appointments, symptoms, weight, nutrition, documents, timeline) — follow the Conditions pattern in `src/services/health/conditions.ts` and `src/app/api/health/conditions/route.ts`
- Document upload flow against the storage bucket
- Charts/trends (Recharts is installed, not yet wired)
- AI extraction service layer (Spec Section 34)

## Architecture rules to keep following

These come straight from Spec Section 43 and matter more as the app grows:
- Never call `supabase.from(...)` from a component or page — go through `src/services/*`
- Never hardcode a hex color — use the Tailwind classes in `tailwind.config.ts`
- Every new table needs RLS with the `auth.uid() = user_id` policy pattern
- Every new polymorphic reference needs the same trigger-validation treatment as `timeline_events`
- UI strings go in `src/locales/{en,fr}/common.json`, never inline
