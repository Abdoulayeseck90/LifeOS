# LifeOS Offline-First Architecture — Design Plan (Not Implemented)

Status: design only. Nothing in this document has been built. Scoped as a
follow-up per the user's explicit choice to defer offline support out of the
Bills/Subscriptions/Receipts implementation pass, rather than build it
speculatively alongside unrelated Finance work.

## The core problem

LifeOS today is Server-Component-first: every list/detail page (`page.tsx`)
fetches data live from Supabase on the server via `Promise.all(...)` and
renders HTML on that request. Client components mutate through `fetch()` to
an API route, then call `router.refresh()` to re-run the server fetch and
get fresh HTML back.

Both halves of that loop require a live round trip to the Next.js server.
There is no client-side data store today — no cached copy of a Task list,
no local database, nothing a page can read from when the network is down.
**A Server Component literally cannot run without a network request to the
server that renders it.** This is the fact every design decision below has
to work around, not the enemy — Server Components stay the right choice for
the online path; offline support is an additional path alongside it, not a
replacement for it.

## What "offline-first" has to mean here

Three separable capabilities, usually conflated under one phrase:

1. **The app shell opens offline** — navigating to LifeOS with no network
   still loads *something* (cached JS/CSS, a shell UI), rather than the
   browser's own offline error page.
2. **Previously-seen data is readable offline** — the Task list you loaded
   an hour ago is still visible, clearly marked as possibly stale.
3. **New data can be created/edited offline and syncs later** — the hard
   part. Requires a local write path that doesn't touch the network, plus a
   sync mechanism that reconciles local writes with the server once
   reconnected.

These are independent and should ship in that order — (1) and (2) are safe,
low-risk, and valuable on their own even if (3) is never built for every
domain.

## Scope: which domains get (3)

Per the spec's list: **Notes, Tasks, Projects, Vitals, Appointments,
Expenses, Bills, Subscriptions, Receipts (metadata only), Credit & Loans,
and debt calculations.**

One item on that list needs a specific callout:

> **Debt calculations already work offline today, for free.**
> `src/lib/finance/amortization.ts` (`computeAmortization`,
> `computeWhatIf`, `computeDebtStrategy`, etc.) are pure, synchronous
> functions — no network call, no Supabase reference, nothing async. Once
> a `CreditCard`/`Loan` object is sitting in the browser (which it is, the
> moment the page renders), every payoff projection, what-if scenario, and
> avalanche/snowball strategy on `/finance/credit-and-loans` computes with
> zero network dependency. The only offline gap for this domain is loading
> the card/loan balances in the first place and saving edits to them — the
> calculator itself has nothing to build. Any offline work for Credit &
> Loans is really just "apply the same local-storage/sync-queue mechanism
> below to CreditCard/Loan records," not "make the math offline-capable."

Receipts is scoped to **metadata only** — merchant/amount/date/category can
be queued offline like any other record, but the receipt *file* has to
reach Supabase Storage eventually and can't be "offline" in any meaningful
sense. The file itself is staged locally (see below) and uploaded once
reconnected; it is not claimed to be available or viewable before that.

## Local persistence layer

**IndexedDB**, via a thin promise-based wrapper (`idb` — small, no reason to
hand-roll the raw callback API or reach for a heavier option like Dexie
unless a need for richer querying shows up later).

One object store per offline-eligible entity, keyed by the same UUID the
server uses. Each record carries two extra fields beyond its normal shape:

- `_syncStatus`: `"synced" | "pending" | "conflict" | "error"`
- `_localUpdatedAt`: client-side ISO timestamp of the last local edit

A separate `sync_queue` store holds pending operations, not full records:

```
{ id, entity_type, entity_id, operation: "create" | "update" | "delete",
  payload, client_timestamp, attempt_count }
```

Queueing operations rather than diffing full records keeps replay simple —
each queue entry maps directly onto one existing API call
(`POST`/`PATCH`/`DELETE` to the route that already exists for that entity).

## Data flow change this actually requires

The offline-eligible pages (Notes, Tasks, etc.) need a client-side read
path that doesn't depend on a fresh server render: on load, hydrate from
IndexedDB first (instant, works offline), then reconcile with a live
server fetch when online, updating IndexedDB with whatever the server
returns. This means those specific pages stop being purely
Server-Component-rendered lists and gain a client-side data layer sitting
in front of (not instead of) the existing API routes and service layer —
the server-side code in `src/services/core/*` and `src/app/api/**`
continues to be the single source of truth and doesn't change shape.

Mutations from these pages write to IndexedDB immediately (optimistic,
marked `pending`), append a `sync_queue` entry, and return instantly
regardless of network state. The existing `fetch()` + `router.refresh()`
pattern used everywhere else in the app is untouched for every
non-offline-eligible domain (Businesses, Goals, Documents, Settings, etc.)
— this is additive, not a rewrite of the whole data layer.

## Service worker

Registered at the app root, scoped to the whole origin. Two
responsibilities, kept deliberately separate:

- **App shell caching** (Cache API): static assets and the shell HTML/JS,
  so the app opens offline at all. Straightforward, low-risk.
- **Reconnect-triggered sync**: the Background Sync API is the "correct"
  primitive for replaying the queue on reconnect, but has no Safari/iOS
  support — it can't be the only mechanism. The portable baseline is a
  plain `window.addEventListener("online", drainSyncQueue)` listener plus
  a periodic retry (e.g., every 30s while `navigator.onLine` is true and
  the queue is non-empty), with Background Sync layered on top as a
  progressive enhancement where the browser supports it.

API routes must be explicitly excluded from the service worker's cache
(network-only, never served from Cache) — caching a stale `POST` response
would be actively harmful, not just unhelpful.

Recommend evaluating `next-pwa` (or Workbox directly) instead of a
hand-rolled service worker — the interaction between Next.js's App Router
build output and service worker caching has known gotchas (cache-busting
on deploy, excluding RSC payload requests) that a maintained tool already
handles.

## Sync queue draining and conflict resolution

On reconnect, the queue drains in order (oldest first), each entry making
the exact same API call a normal online mutation would make. Two outcomes
per entry:

- **Success**: mark the local record `synced`, remove the queue entry.
- **Failure**: the reason matters.
  - Validation failure (the same 400 an online request could get) — mark
    the record `error` with the server's message, keep the queue entry so
    the user can fix and retry; never silently drop it.
  - **Conflict** — the server's `updated_at` for that entity is newer than
    the `client_timestamp` this queued operation was based on, meaning
    another device (LifeOS already supports multiple devices per user,
    per the push-subscription design) changed the same record first. This
    is a real scenario for a multi-device single-user app, not a
    theoretical one. Resolution: **never silently overwrite, never
    silently discard.** Mark the record `conflict` and surface both
    versions to the user (a small "this was also changed elsewhere —
    keep mine / keep theirs / view both" affordance) rather than picking
    a winner automatically. Last-Write-Wins is tempting for its
    simplicity but means a real edit from one device can vanish without
    the user ever knowing it happened — not acceptable for financial or
    health data.
  - **Delete-vs-edit**: a queued delete for a record that was edited
    elsewhere before sync, or vice versa, follows the same rule — surfaced
    as a conflict, not resolved by whichever operation happens to run
    first.

The explicit constraint carried over from the spec: **do not claim
synchronization until it actually succeeds.** Every offline-created record
shows a visible, per-record `pending sync` indicator (not a blanket
"you're offline, don't worry" banner) until its queue entry actually
receives a success response. A failed or conflicted sync is a visible
error state on that specific record, not something that fails silently in
a background task the user has no way to notice.

## Suggested phased rollout

Building all of this at once for every listed domain is the wrong shape —
proposing an incremental order instead:

1. **App shell + static asset caching.** Lowest risk, immediate value —
   the app opens (even to stale content) with no network. No data layer
   changes.
2. **Read-only offline cache.** Opportunistically write fetched
   list/detail data into IndexedDB as pages load online; serve from cache
   with a clear "offline — last synced [time]" banner when the network is
   down. Still no mutations, so no sync queue or conflict logic needed
   yet.
3. **Offline mutations, smallest-blast-radius domains first — Notes and
   Tasks.** Single-owner, low collision risk, no financial consequence if
   something goes wrong. This is where the sync queue and conflict-surface
   UI actually get built and proven out.
4. **Extend the same infrastructure** to Projects, Vitals, Appointments,
   Expenses, Bills, Subscriptions, and Credit & Loans — by this point the
   queue/conflict mechanism is generic; each domain mostly adds its own
   IndexedDB store and reuses the existing drain/conflict logic.
5. **Receipts**, last, because of the file-staging complication: the
   picked file is held as a `Blob` in IndexedDB alongside the queued
   metadata, and only uploaded to Supabase Storage once reconnected —
   never claimed as viewable or synced before that upload actually
   completes.

Each phase is independently shippable and independently valuable; nothing
here requires committing to phase 5 to get real value from phase 1.
