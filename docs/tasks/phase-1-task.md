
# Phase 1 — Git workflow, rename to SpreadsheetMillionaire, MVP calculator narrowing

Read `CLAUDE.md`, `PROJECT_STRUCTURE.md`, and `DECISIONS.md` in full before touching anything. Then present your plan (files changed, files added, destination paths) and wait for my approval before writing code.

## Context

We're taking this app from prototype to public MVP under the new name **SpreadsheetMillionaire** (domain: spreadsheetmillionaire.com). The MVP ships with 4 of the 12 calculators: **FIRE, Compound Interest, Emergency Fund, Debt Payoff**. The other 8 stay in the codebase, hidden behind a `published` flag, and get re-enabled one by one as build-in-public patches. This task also sets up the production git workflow. Postgres/Redis migration and the marketing landing page are LATER tasks — do not start them.

---

## Part 0 — Preconditions (verify, don't assume)

1. `git status` is clean and we're on `main`. If not, stop and tell me.
2. `gh auth status` succeeds. If `gh` is missing or unauthenticated, stop and tell me what to run.
3. Confirm the GitHub remote name/owner before any `gh` call.

## Part 1 — Git workflow setup

1. Tag the current state so the prototype is always recoverable: `git tag v0.1.0-prototype` and push the tag.
2. Create `develop` from `main` and push it with upstream tracking.
3. Configure the repo via `gh repo edit`: squash merge enabled, merge commits and rebase merge disabled, delete-branch-on-merge enabled.
4. Attempt branch protection on `main` (require PR before merging, block force pushes) via `gh`. If the repo is private on a free GitHub plan, GitHub won't enforce protection rules — in that case, don't fail the task; print the limitation and move on. Discipline + this workflow covers us until the plan changes.
5. Create the working branch for everything below: `feature/rename-and-mvp-narrowing` off `develop`. All subsequent commits go here.

## Part 2 — Rename FINtrackr → SpreadsheetMillionaire

1. `grep -ri fintrackr` across the repo, excluding `node_modules`, `venv`, `.git`, `__pycache__`, `flask_session`, and the `*.db*` files. Use the hit list as your worklist — don't work from memory.
2. Rename in:
   - `frontend/index.html` — `<title>` and any meta tags
   - `frontend/package.json` — `"name": "spreadsheetmillionaire"`
   - All user-visible brand strings: sidebar/header brand text, landing page, `AuthForm` copy, anything else the grep surfaces in JSX
   - `README.md`, plus the headings/intro lines of `PROJECT_STRUCTURE.md` and `DECISIONS.md`
   - `frontend/src/constants.js` — storage key prefixes `fintrackr_` → `sm_` (e.g. `sm_favourites_${user.id}`). Breaking existing localStorage is acceptable; we're pre-launch with no real users. Keys live ONLY in constants.js — if the grep finds a hardcoded key anywhere else, that's a pre-existing bug: fix it by importing from constants.
3. **Leave the SQLite filename alone.** `fintrackr.db` and the `DATABASE_PATH` value in `.env` stay as-is — the upcoming Neon/Postgres migration retires SQLite entirely, so renaming the file now just churns dev environments for nothing. Add a one-line note in README that the dev DB filename is legacy.
4. If a `FINTRACKR_DESIGN_SPEC.md` exists in the repo, rename it to `DESIGN_SPEC.md` and update any references to it.

## Part 3 — `published` flag in the calculator registry

1. Read `frontend/src/calculators/registry.js` first and confirm the exact `type` slugs for FIRE, Compound Interest, Emergency Fund, and Debt Payoff. Do not guess slugs.
2. Add `published: true | false` to **every** registry entry — `true` for those four, `false` for the other eight. Document it as a required field.
3. Export a derived published list from the registry (e.g. filter on `published`) following the file's existing export style. Do not create a second list of calculators anywhere — derive, don't duplicate.
4. Update every consumer that enumerates calculators to use the published list: `CalculatorSidebar` (grouped nav), `LandingPage` (grid + category filter tabs), and anything else — grep for imports of the registry to find them all. Empty categories must not render as empty groups.
5. `CalculatorPage` already guards against unknown `type` params. Extend that same guard: a type that exists but has `published: false` redirects to the same place an unknown type does. No separate "coming soon" page in this phase.
6. **Do NOT touch `backend/calc_types.py`.** All 12 types stay valid server-side so existing saved rows remain loadable and unpublished calculators stay testable on `develop`. The narrowing is a frontend-visibility concern only.
7. **Do NOT modify the 8 unpublished calculator components.** They are buggy; fixing them is explicitly out of scope for this task.
8. Verify favourites: a localStorage favourite pointing at an unpublished type must not render a card or crash the grid. If filtering through the published list doesn't already handle this, fix it.

## Part 4 — Documentation updates (same PR)

1. `PROJECT_STRUCTURE.md`: add `published` to the registry-entry shape with the four currently-published types listed; update the brand name.
2. `DECISIONS.md`: add two new sections in the established format (TL;DR line, Decision, Why, When to revisit):
   - **"MVP narrowing via `published` flag"** — why flag instead of delete (one-line flip re-enables a calculator as a build-in-public patch; saved data and backend types stay intact; no dead-code resurrection risk).
   - **"Git branching model"** — main/develop/feature, conventional commits, squash merge, tags on releases, and why this shape (solo dev learning production workflow; preview deploys per branch later via Vercel).

## Part 5 — Verification & PR

1. `cd frontend && npm run build` must pass.
2. Run the app (backend: `cd backend && python -m app`; frontend: `npm run dev`) and confirm: only 4 calculators in sidebar and grid; a direct URL to an unpublished slug redirects; save/load still works on a published calculator; brand shows SpreadsheetMillionaire everywhere.
3. Re-run the fintrackr grep — remaining hits should only be the DB filename, `.env`, and the README legacy note.
4. Commit per part with conventional messages, e.g.:
   - `chore: set up main/develop branching and repo merge settings`
   - `chore: rebrand FINtrackr to SpreadsheetMillionaire`
   - `feat: narrow public MVP to 4 calculators via registry published flag`
   - `docs: record MVP narrowing and git branching decisions`
5. Push and open the PR into `develop` with `gh pr create`, summarising the four parts. Do not merge it — I review first.

## Guardrails (repeat offenders — check yourself against these)

- Backend imports: `from calc_types import ...`, never `from backend.calc_types import ...`. Flask runs from inside `backend/`.
- If the first mutating API request 403s after a Flask restart, that's the known stale-CSRF flake — refresh the page, don't chase it.
- No new dependencies. No TypeScript, no refactors beyond the task, no fixing the 8 hidden calculators "while you're in there."
- If anything in the existing code contradicts these instructions, stop and ask rather than picking silently.
