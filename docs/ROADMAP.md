# SpreadsheetMillionaire — Release Roadmap (v0.14 → v1.5)

> **Status:** Planning intent, not a record. Current HEAD is **v0.14.4** — Phase 14 (go-live readiness + instrumentation) is complete, and the build-in-public rollout finished during it: **all 12 calculators and both trackers are live in production** (runtime publish stays admin-toggleable). Resequenced 2026-07-14: **I&E bulk data entry takes Phase 15 (`v0.15.x`); billing slides to Phase 16 (`v0.16.0`)** and absorbs what remains of the former "trackers go live" phase (see § Phase 16).
>
> **The repo is the source of truth, not this file.** Before any item here becomes a ticket or code, confirm it against `project.md`, `STATUS.md`, `DECISIONS.md`, and `PROJECT_STRUCTURE.md`. Where this doc says "already exists" or "confirm," it means *verify against the repo* — paths, current flag names, and exact schema shapes are not reproduced here on purpose.
>
> **How to use with Claude Code:** each release lists a goal, dependencies, what ships, the engineering invariants that apply, what's explicitly out of scope, and suggested epic-level tickets. Implement in order — the back half hangs off billing (Phase 16).

---

## The spine

**Measure (14) → Bulk input (15) → Monetize (16) → Differentiate + Retain (17) = v1.0**, then the growth loops: **referral (1.1) → goals + virality (1.2) → AI (1.3) → affiliate (1.4)**. Deferred bets (1.5) are listed for completeness, not scheduled.

Everything monetization-related is downstream of **Phase 16 (billing)**. Do not pull paid features forward of it.

---

## Engineering invariants (apply across every phase)

Referenced by number in each release. One source of truth — defined here, not repeated.

1. **Three-layer entitlement gating.** Any premium/tiered feature gates in all three: (a) UI renders a paywall/teaser, (b) API route refuses (401/402/403 as appropriate), (c) DB query won't return data the user shouldn't see. Fewer than three = security bug.
2. **Entitlement is computed, never a stored boolean.** `is_premium = active_paid_subscription OR unexpired_credit`. Single helper, imported by all three gating layers.
3. **Stripe webhook is the source of truth for subscription state.** Signature-verified, idempotent, tolerant of out-of-order events. The client never sets tier.
4. **Saved-data versioning + idempotent migration** for every new or changed stored shape. From day one. No exceptions, including trackers, ledgers, goals.
5. **IDOR protection lives at the query layer.** Every user-scoped query filters by owner id *in the query itself*. No middleware saves you.
6. **Money-out reconciliation is bought, not built.** Payout/commission/refund-clawback logic is delegated to a vendor, never hand-rolled.
7. **Boring failure beats clever recovery.** Exit on bad config, reject unrecognized types, reject malformed data with a clear warning rather than guessing, resolve transport failures to a clear error rather than hanging.
8. **Privacy-leaning by default (posture, not a hard rule for SM).** Prefer cookieless / first-party / EU-hosted vendors; no feature should *require* third-party tracking to function. (SM is React/Vite, so unlike cutecumber it has no "zero third-party script" constraint — this is a brand/consent preference.)
9. **Never claw back a shipped free-tier feature.** Decide the free/premium boundary *before* exposing a feature. The worst move in freemium is taking something away.
10. **Derived and AI output is disclaimed.** Scores, projections, and insights are not financial advice, and AI explains computed values rather than inventing numbers.

---

## Phase 14 — Go-live readiness + instrumentation (`v0.14.x`) — ✅ complete

> Shipped as `v0.14.0`–`v0.14.2` (+ patches `v0.14.3`/`v0.14.4`). The "trackers stay dark" premise below was overtaken during the rollout: both trackers (and all 12 calculators) went live in production, free, via the runtime publish toggles. That has consequences for the free/premium boundary — see § Phase 16.

**Goal:** make the *existing* product observable, legally shippable, and tested on the load-bearing paths. No new monetization. Trackers stay dark.
**Depends on:** nothing (current HEAD).

### `v0.14.0` — Observability + analytics foundation
- **Ships:** Sentry (Flask + React), structured request logging, uptime/health monitoring on Render (cheap tiers cold-start), **PostHog (EU cloud)** with the activation funnel instrumented end-to-end: `calculator_used → account_created → tracker_first_entry → second_session → upgrade_viewed → upgrade_clicked`. Fills the Analytics placeholder (v0.12.1) with real event data. MRR card stays a placeholder until v0.15.
- **Why first:** you cannot set a data-driven free/premium boundary in Phase 16 if you only start measuring *after* exposing the features.
- **Invariants:** 8.
- **Out of scope:** A/B experiments (PostHog supports them — defer), MRR (needs billing).
- **Tickets:** Sentry backend · Sentry frontend (note: central 401 logout + error boundary already exist, v0.13.0 — wire Sentry into them) · structured logging middleware · uptime monitor · PostHog SDK + funnel events · PostHog → `/admin` analytics surface.

### `v0.14.1` — Data lifecycle + legal
- **Ships:** account deletion (hard delete, cascade across NW + I&E + saved-calc tables), data export ("download my data": all user-scoped rows as JSON/CSV), privacy policy + ToS (slot into the marketing placeholder sections from v0.13.1).
- **Invariants:** 5 (cascade must hit *every* user-scoped table), 7.
- **⚠ Risk:** deletion cascade is destructive and security-sensitive. Enumerate every user-scoped table against `PROJECT_STRUCTURE.md`/`STATUS.md` before writing — one missed table leaves orphaned financial rows.
- **Tickets:** deletion service + cascade · export endpoint · legal pages · admin: trigger deletion/export for support.

### `v0.14.2` — CI confidence + scale sanity
- **Ships:** finish the pytest harness (issue #25, real Postgres in CI) covering the migration system, entitlement checks, save flow, and deletion cascade. Confirm Neon **pooled** connection string under load. Confirm auth-endpoint rate limits (login / signup / reset / verify-resend) — write rate limits exist (v0.13.0), verify they cover auth specifically.
- **Invariants:** 4, 5.
- **Out of scope:** exhaustive coverage. Test the money/data paths, skip trivia.
- **Tickets:** CI Postgres service container (mind the #25 gotchas: config-validation timing, SSL mode, Talisman, rate-limiter bleed, CSRF handling, per-request commit isolation) · migration tests · entitlement tests · deletion-cascade test · pooling check · auth rate-limit audit.

**Gate:** answers "is it solid for go-live." Trackers still dark.

---

## Phase 15 — I&E bulk data entry (`v0.15.x`) — the input rework

**Goal:** make entering a whole month of bookkeeping convenient. Adding transactions one-by-one is fine for a single purchase, tedious for real monthly bookkeeping. Three input modes, in order of bulk: per-transaction entry (exists) → **monthly category grid** (this cycle) → PDF bank-statement import (backlog, #296).
**Depends on:** nothing new — trackers are live and hold real data; 14.0's instrumentation watches adoption of the new entry mode.

- **Ships:** month-at-a-time category grid on the I&E tracker — pick a month, fill each curated category's sum (income + expense sections), save in bulk. Concretely: `source` column + bulk month-entry API with upsert semantics (#292) · "Monthly entry" tab grid UI with spreadsheet-like keyboard flow (#293) · overview/selectors verified to treat aggregate rows identically (#294) · this resequencing doc (#295). Data-model decision (aggregate row per type+category+month, `source='monthly'`) recorded in `DECISIONS.md` **before** implementation.
- **Invariants:** 5, 7. (Saved-shape discipline: `ie_*` are first-class normalised tables — they evolve via idempotent DDL in `db_init.py`, not blob versioning; see CLAUDE.md hard rule 5.)
- **Out of scope:** PDF import (#296 — backlog, unscheduled), CSV import (#206–#210 — slotted `v0.16.1`), live bank feeds (v1.5 / v2.0 assessment).
- **Tickets:** #292 · #293 · #294 · #295 (milestone `v0.15.0`).

---

## Phase 16 — Billing (`v0.16.0`) — the keystone

**Goal:** premium becomes purchasable. Every monetization feature downstream depends on this.
**Depends on:** 14.0 (so you can watch the purchase funnel).

**Absorbed from the former "trackers go live" phase (overtaken by events — trackers already went live, free, during the v0.14.x rollout):** the **free/premium boundary decision** is now a Phase-16 prerequisite, and it is constrained by invariant 9 — everything live today (both trackers, manual + monthly-grid entry, current charts/history) is the free tier's floor and cannot be clawed back. Premium must be **additive**: e.g. CSV/PDF import, recurring-transaction depth, future bridge/Score/AI surfaces. Decide from the v0.14 funnel data, record in `DECISIONS.md`, and gate whatever ships premium at three layers (invariant 1). Tracker onboarding + upgrade prompts fold in here too.

- **Ships:** Stripe Checkout (subscription) · Customer Portal (manage/cancel) · webhook handler (signed, idempotent, order-independent) syncing subscription → tier · **computed-entitlement helper** (`active_paid_sub OR unexpired_credit` — the credit half is dormant until v1.1, but build the shape now) · receipt + payment-failed/dunning emails (Resend) · real MRR replacing the placeholder · admin billing-state visibility + manual credit grant/revoke (extends existing tier management, v0.12).
- **Invariants:** 1, 2, 3, 7. Touches **payments and entitlements** — this is the smallest, most-tested release of the lot.
- **Out of scope:** referral credits (1.1), affiliate payouts (1.4). Only the computed-entitlement *shape* lands now.
- **Tickets:** pre-filed #189–#197 — Stripe products/prices config · Checkout session endpoint · Customer Portal · webhook handler (signed + idempotent + event-log table) · tier-sync logic · computed-entitlement helper (single source) · dunning + receipt emails · admin billing panel · tests: webhook idempotency, out-of-order events, entitlement union. Plus, from the absorbed go-live phase: boundary decision doc (`DECISIONS.md`) · three-layer gates on whatever ships premium · onboarding/upgrade-prompt components (instrumented).

### `v0.16.1` — CSV import (activation unlock)
- **Ships:** CSV bank-statement import into I&E — column mapping, dedupe, preview-before-commit. "Upload your statement" is the bulk end of the input spectrum Phase 15 opened (per-transaction → monthly grid → statement import); imported rows reuse the `source` marker from the Phase-15 data model (`source='import'`).
- **Invariants:** 4 (imported rows = same normalised shape), 5, 7 (reject malformed CSV with a clear error — don't guess columns).
- **Out of scope:** live bank feeds (1.5 / v2.0). PDF statement import (Kontoauszug) is the unscheduled complement — backlog #296.
- **Tickets:** pre-filed #206–#210 — upload + parse · column-mapping UI · dedupe/preview · commit · premium gate (three-layer).

---

## Phase 17 — The bridge + synthesis (`v0.17.0`) — the moat + retention

**Goal:** make tracker data compound into things no calculator site can replicate.
**Depends on:** 15 (bulk entry feeding the trackers real data), 16 (a real paywall to gate against, if bridge/Score ship premium).

- **Ships:**
  - **Calculator↔tracker bridge** — FIRE calculator optionally reads *real* net worth (NW) and *real* savings rate (I&E) as inputs, projecting actual trajectory instead of a hypothetical.
  - **Financial Health Score** — one composite metric from tracker data (savings rate, emergency-fund coverage, debt-to-asset [already computed, v0.11.1], net-worth trend).
  - **Monthly snapshot email** (Resend) reporting net-worth delta + Score change. Uses auto-snapshots — confirm/finish that backlog item.
- **Invariants:** 1 (decide whether bridge/Score are premium-gated), 10 (Score is derived, not advice — disclaim).
- **Out of scope:** AI narrative on the Score (that's v1.3).
- **Tickets:** bridge data layer (tracker→calc read API, owner-scoped) · FIRE bridge UI (opt-in) · Health Score calc (single source) · Score UI · auto-snapshot job · monthly email template + send job + unsubscribe.

---

## `v1.0` — declare when 14–17 ship and stabilize

Solid, monetized, differentiated, retaining. A real line, not a vanity tag. Suggested: a short stabilization window (bug-fix point releases) before tagging.

---

## `v1.1` — Free-months referral (user → user)

**Goal:** cheapest organic acquisition loop.
**Depends on:** 16 (computed entitlement + credit-ledger shape).

- **Ships:** referral codes/links · referral ledger (credit balance + expiry — **separate from Stripe**, no fake subscriptions) · entitlement now reads the credit half of the union (lit up here) · reward on a **qualifying event, not signup** (recommend: referred user email-verified + a meaningful action; stricter option: referred user converts to paid) · credit-vs-paid interaction (when a credited user starts paying mid-credit, **pause** the free months — better retention than burning them) · admin visibility + fraud guardrails (caps, throwaway-domain checks).
- **Invariants:** 1, 2, 4 (ledger = versioned), 5.
- **Decisions to pin (`DECISIONS.md`):** the qualifying event; pause-vs-burn on conversion.
- **Out of scope:** cash payouts (that's 1.4).
- **Note:** could pull earlier (right after 16) if you want launch virality — but it's cleaner once billing + the entitlement union are proven in production.

---

## `v1.2` — Goals + shareable results

**Goal:** motivation (retention) + light virality (feeds 1.1).
**Depends on:** 16 (goals are likely premium → need billing), 17 (Score pairs with goals).

- **Ships:** **Goals as a first-class object** (target + deadline + progress from tracker data — emergency fund £10k, net worth £100k, card paid off by date) · goal nudges (reuse the monthly email rail) · **shareable read-only result links** (FIRE projection / net-worth chart, public, no auth, "make your own" CTA → funnel top, reinforces referral).
- **Invariants:** 1 (goals likely premium), 4 (goals = versioned shape), 5.
- **⚠ Risk:** share-link generation must **not** expose the underlying account. Render a **frozen, sanitized snapshot**, never a live owner-scoped query behind a guessable URL.
- **Tickets:** goals schema + migration · goal CRUD (gated) · progress calc · nudge email · public snapshot generator · share-link route + sanitization · "make your own" CTA.

---

## `v1.3` — AI insights

**Goal:** premium differentiator on top of structured data.
**Depends on:** 17 (the Score gives the model grounded, structured inputs).

- **Ships:** AI analysis of spending patterns / net-worth trajectory / Score drivers · **premium-gated (three-layer)** · **rate-limited + cost-capped per user** (matters on a minimal budget) · strong disclaimers · **no hallucinated numbers** — feed it computed values; it explains, it doesn't invent.
- **Invariants:** 1, 10.
- **⚠ Risk:** highest trust/liability surface in the app. Cost cap + disclaimer + grounded inputs are requirements, not polish.
- **Tickets:** insight prompt + grounding layer (pass computed metrics, not raw rows) · per-user rate limit + cost cap · premium gate · disclaimer UI · PostHog: insight engagement.

---

## `v1.4` — Affiliate program (influencer cash rev-share)

**Goal:** creator distribution once there's traction + MRR.
**Depends on:** 16 (real subscriptions to share revenue on) and, realistically, meaningful paying volume — influencers won't promote a product with no traction.

- **Ships:** **buy, don't build** — Rewardful or Tolt on top of Stripe (attribution + recurring commission + refund clawback + payouts; budget roughly ~$50/mo, **verify current pricing**) · affiliate ToS · tax handling (1099 / W-8 via the tool) · recurring commission on referred subscription revenue · self-referral / fraud guards.
- **Invariants:** 6 (money-out reconciliation is bought, not hand-rolled).
- **⚠ This is a different risk class from v1.1.** v1.1 is an entitlement grant (no money leaves your account). This is a **money-out payout program** — refund clawbacks, tax forms, and attribution over each subscription's full lifetime are exactly why it's bought and placed late.
- **Out of scope:** building your own payout/reconciliation engine.
- **Tickets:** select + integrate Rewardful/Tolt · Stripe Connect if the chosen tool requires it · affiliate signup + dashboard handoff · affiliate ToS · fraud guards · reconcile commission events into admin view.

---

## `v1.5` — Deferred / to be assessed

**Not scheduled. Listed so the roadmap is complete, not so it's planned.** Re-evaluate each against real data (traffic, revenue, audience geography) before committing. **Assessment trigger:** a named metric threshold, decided once you have ~3 months of PostHog + MRR data. Do not pull any of these forward on instinct.

- **Ads on the free tier — TO BE ASSESSED.** Revisit only at meaningful free-traffic scale. Current read: fights the privacy-leaning brand, competes with your own free-tier monetization (free users are the referral + conversion pool), and untargeted CPMs (the only kind compatible with your posture) likely won't beat the cost. If revisited, prefer a single discreet, genuinely-recommended finance affiliate over an ad network.
- **Bank-feed aggregation (Plaid / TrueLayer / GoCardless open banking) — TO BE ASSESSED.** The biggest value multiplier (auto-sync vs manual/CSV) and the biggest jump in cost (per-connection fees vs minimal budget), security (bank tokens), compliance, and architecture. The **v2.0 bet** — only if SM becomes the primary product rather than a side project.
- **Multi-currency — TO BE ASSESSED.** Touches every stored amount + tracker aggregation (version bump + migration on user data). Only if international traffic actually shows up in PostHog. Cheap to defer, expensive to do speculatively.
- **Depth backlog — slot opportunistically into 1.x point releases as the data dictates:** longer-horizon forecasting (recurring + short forecast already shipped, v0.11.1), per-asset history, allocation view, scenario save/compare.

---

## Dependency quick-reference

```
14 ✅ (measure/legal/CI) ──> 15 (bulk input) ──> 16 (billing + boundary) ──┬─> 17 (bridge+Score) ──> v1.0
                                                                           ├─> 16.1 CSV import
                                                                           ├─> 1.1 referral (needs entitlement union)
                                                                           └─> 1.4 affiliate (needs real MRR + volume)
1.3 AI (needs 17's Score) · 1.2 goals (needs 16 + 17)
v1.5 = unscheduled; assess against 3 months of PostHog + MRR data.
```
