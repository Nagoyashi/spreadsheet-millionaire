# SpreadsheetMillionaire

Personal-finance calculator web app. Flask API + React/Vite SPA. Anonymous users can use every published calculator; authenticated users can save/load/rename/delete their inputs. The public MVP ships 4 of 12 calculators; the other 8 are hidden behind a `published` flag and re-enable one at a time as build-in-public patches.

## Read before structural work

- `project.md` — canonical roadmap: current phase, scope + acceptance, phase log. Check what phase we're in before starting work.
- `PROJECT_STRUCTURE.md` — canonical file tree, paths, conventions. Never guess at a path; check here.
- `DECISIONS.md` — the *why* behind every architectural choice, with revisit conditions. Read the relevant section before changing or working around a pattern. If a decision is wrong, say so explicitly — don't silently route around it.
- `STATUS.md` — technical/API reference: stack, providers, architecture, data model, API contracts, security posture.
- Update these whenever a change warrants it, in the same PR as the change.

## Commands

- Backend: `cd backend && python -m app` (Flask on :5000 — must run from `backend/`)
- Backend (prod-style): `cd backend && gunicorn --workers 2 --bind 0.0.0.0:$PORT 'app:create_app()'` (the Render start command — `app:create_app()` factory target, run from `backend/`)
- Frontend: `cd frontend && npm run dev` (Vite on :5173, proxies `/api/*` to :5000)
- DB schema/migrations: `cd backend && python db_init.py` (idempotent)
- Frontend build check: `cd frontend && npm run build`

## Hard rules — violating any of these is a bug

1. **Backend imports:** `from calc_types import X` — NEVER `from backend.calc_types import X`. Flask runs from inside `backend/`, so `backend.` prefixes break at runtime. Applies to all intra-backend imports.
2. **Single source of truth.** Calculator metadata → `frontend/src/calculators/registry.js`. Valid calc types (backend) → `backend/calc_types.py`. Storage keys → `frontend/src/constants.js`. Number formatting → `fmt()` in `frontend/src/utils/format.js`. Never duplicate any of these definitions; derive from the source instead.
3. **Published surface.** Every user-facing enumeration of calculators (nav, grids, tabs, routing guards) derives from `PUBLISHED_CALCULATORS` / `PUBLISHED_TYPES` in the registry. Never re-filter the full `CALCULATORS` list in a consumer and never maintain a second list. `backend/calc_types.py` keeps ALL types valid regardless of published state — saved rows for unpublished calculators must remain loadable.
4. **No raw `fetch` in feature modules.** All HTTP goes through `httpClient.createApi(baseUrl)` via a module in `src/api/`. CSRF injection is handled there.
5. **Every saved-data shape has `version: 1`** as its first field and a migration path in `frontend/src/utils/migrateCalcData.js`. No exceptions, including future trackers.
6. **Every query against a user-scoped table includes the `user_id` filter** (`AND user_id = ?` / `%s`). IDOR protection lives at the query layer. No exceptions.
7. **Parameterised SQL only, no ORM.** Never build SQL with f-strings or concatenation.
8. **Paid features are gated at three layers:** UI component, API route, DB query. Gating only one or two is a security bug — flag it.
9. **Calculator components never render their own explainer.** The registry's `explainer: { heading, body }` drives `<CalculatorExplainer>` in `CalculatorPage`.
10. **Repo hygiene.** Never commit: `node_modules/`, `venv/`, `__pycache__/`, `.env`, `*.db*`, `flask_session/`, cookie jars, or any credential/session artifact. The history was scrubbed once already; review `git status` before staging and never `git add .` blindly.

## Don't add without explicit approval

TypeScript, SQLAlchemy/any ORM, Redux/Zustand/Context-for-app-state, auth providers (Clerk/Auth0), UI kits, or any major dependency. The codebase is deliberately boring and transparent — justify new dependencies against the problem size, not "industry standard."

## Git workflow

- Branches: `main` (production) ← `develop` (staging) ← `feature/*`
- Never commit directly to `main`. Feature branches branch off `develop` and merge back via PR.
- **Merge strategy (matters — don't mix these up):**
  - `feature/*` → `develop`: **squash-merge**. One clean commit per feature on `develop`; the messy in-progress commits stay on the branch.
  - `develop` → `main` (releases): **merge commit** (`gh pr merge --merge`), *never* squash. Squashing a release rewrites `develop`'s commits as a brand-new commit on `main`, so the branches **diverge** and every subsequent release fights phantom conflicts. A merge commit keeps `main` and `develop` sharing history, and preserves the per-phase commits on `main`.
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`. One logical change per commit.
- Releases: PR `develop` → `main` (merge commit), then tag (`v0.6.0`, ...).

## Known flakes (don't chase these)

- Stale CSRF token after a Flask restart: first mutating request 403s. Known issue; a page refresh re-fetches the token. Not a bug to fix mid-task.

## Working style

- Before any non-trivial change, state the plan: which files change, which are new, where each lives. Then write.
- Complete, production-ready code. No `// add your logic here`, no truncated snippets.
- When an error occurs, diagnose from the stack trace: exact file, exact line, exact fix.

## Task tracking

Non-trivial work is tracked as GitHub issues, which auto-flow into the GitHub
Project "spreadsheetmillionaire.com" (Backlog column) via its Auto-add
workflow — just create well-formed issues; don't add them to the board manually.

- When to file: anything not finished this session; bugs, security concerns,
  tech debt, or gaps you notice. Not for trivial fixes done immediately.
- Before filing: `gh issue list --search "<keywords>"` to avoid duplicates.
- Title: imperative ("Gate Sankey calculator export behind paid tier").
  Body: **Context** (with file paths) / **Acceptance criteria** / **Notes**.
- Labels (one of each): type `type:feature|bug|chore|refactor|docs|security`,
  priority `prio:high|med|low`.
- Create: `gh issue create -t "<title>" -b "<body>" -l "type:bug,prio:high"`

## Roadmap & tasks

- **`project.md` is the canonical roadmap** — the phase-level plan, current
  phase, per-phase scope + acceptance criteria, and the Phase log. The GitHub
  Project board owns per-task execution status. They never track the same thing:
  update `project.md`'s Phase log when a phase ships; never restate per-task
  status there (link to the board instead). Deeper rationale → `DECISIONS.md`.

## Release ritual

A pointer/checklist, not the full procedure — see `project.md` and `docs/DEPLOYMENT.md` for the detail.

- **Plan:** phases are planned by the owner in `project.md`. Don't invent phases.
- **Promote:** turn only **current + next** phase tasks into issues. Never
  materialize all future phases into issues up front.
- **Execute:** move each card Todo → In Progress → Done on the board as you work.
- **On phase completion:**
  1. Tag the next semver `vX.Y.0` (per `DECISIONS.md` § "Git branching model").
  2. Update `project.md` — add to Shipped, add a Phase-log entry, advance the
     current-phase pointer.
  3. Update `README.md`.
  4. Write `docs/releases/vX.Y.Z.md`.
- **Archiving:** closed cards **auto-archive** — do NOT create an "Archived"
  status or move cards by hand. The `project.md` Phase log is the durable record.

Roadmap/phase status lives in `project.md` (source of truth); task status lives on the board. Never duplicate the two.
