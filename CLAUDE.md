# SpreadsheetMillionaire

Personal-finance calculator web app. Flask API + React/Vite SPA. Anonymous users can use every published calculator; authenticated users can save/load/rename/delete their inputs. All 12 calculators and both trackers are published in production (the build-in-public rollout is complete); publish state stays runtime/DB-backed and admin-toggleable, so any surface can still be unpublished without a deploy.

## Session protocol — how to resume

On **"continue"**, **"read status"**, **"where are we"**, or any cold start, run this EXACTLY before proposing work. The live cycle state is **derived from GitHub**, never guessed or remembered.

1. **Rules & plan:** this file (rules) + `project.md` (vision, roadmap, the editorial *Current cycle* pointer, phase log).
2. **Live state — query GitHub** (the source of truth for cycle progress):
   - Open milestone = the current cycle:
     `gh api "repos/:owner/:repo/milestones?state=open" --jq '.[] | "\(.title): \(.open_issues) open / \(.closed_issues) closed"'`
   - Issues in that cycle (done vs remaining):
     `gh issue list --milestone "<title>" --state all --json number,title,state -q '.[] | "\(.state) #\(.number) \(.title)"'`
   - Release staged? (open `develop`→`main` PR):
     `gh pr list --base main --state open --json number,title,headRefName`
   - In-progress work + where it stopped: open feature PRs `gh pr list --state open`, then the latest comment on the in-progress issue `gh issue view <N> --comments`, plus `git branch --show-current` and `git log --oneline -5`.
3. **Locate the moment** on the state table below.
4. **Report** in one short paragraph: cycle name + progress (X/Y issues), the in-progress issue with its branch and last stopping point, and the single proposed next action. Then **STOP and wait** for the go-ahead.

### Release-cycle state machine

| Live signal (from step 2) | Moment | Propose (don't execute) |
|---|---|---|
| No open milestone | Between cycles | Next cycle from `project.md` § Future → on approval, open a milestone + promote its issues |
| Open milestone, ≥1 issue open | Mid-cycle | Resume the in-progress issue (read its latest comment first) |
| Open milestone, all issues closed | Cycle complete | Run the **Release ritual** (write notes, update `project.md`, open `develop`→`main` PR) |
| Open `develop`→`main` PR | Release staged | Awaiting your merge + tag (the ship-it gate) |
| Tag pushed, Release exists | Shipped | Confirm Release + milestone closed → back to "between cycles" |

### Ending a session

Before you stop (or when told to "wrap up"), post the stopping point as a comment on the in-progress issue, so the next session resumes precisely:
`gh issue comment <N> --body "Session end — done: <…> · next: <…> · branch <branch> · last commit <sha>"`
Mid-issue progress lives on the issue, not in a new file.

## Read before structural work

The full map of *what each doc owns* is in `README.md` § "Where to learn more" — don't restate it here or anywhere else. Operationally:

- Know the **current cycle** before starting (see § Session protocol): the open milestone is the source of truth; `project.md`'s pointer only mirrors it.
- `PROJECT_STRUCTURE.md` before touching paths — never guess a path.
- The relevant `DECISIONS.md` section before changing or working around a pattern. If a decision is wrong, say so explicitly — don't silently route around it.
- Update any doc a change affects, in the same PR as the change.

## Commands

- Backend: `cd backend && python -m app` (Flask on :5000 — must run from `backend/`)
- Backend (prod-style): `cd backend && gunicorn --workers 2 --bind 0.0.0.0:$PORT 'app:create_app()'` (the Render start command — `app:create_app()` factory target, run from `backend/`)
- Frontend: `cd frontend && npm run dev` (Vite on :5173, proxies `/api/*` to :5000)
- DB schema/migrations: `cd backend && python db_init.py` (idempotent)
- Frontend build check: `cd frontend && npm run build`
- Frontend lint / format: `cd frontend && npm run lint` (ESLint) · `npm run format` (Prettier write) · `npm run format:check`
- Frontend tests: `cd frontend && npm test` (vitest). Backend tests: `cd backend && pytest` (DB-backed tests need `TEST_DATABASE_URL`, else they skip)

## Hard rules — violating any of these is a bug

1. **Backend imports:** `from calc_types import X` — NEVER `from backend.calc_types import X`. Flask runs from inside `backend/`, so `backend.` prefixes break at runtime. Applies to all intra-backend imports.
2. **Single source of truth.** Calculator metadata → `frontend/src/calculators/registry.js`. Valid calc types (backend) → `backend/calc_types.py`. Storage keys → `frontend/src/constants.js`. Number formatting → `fmt()` in `frontend/src/utils/format.js`. Never duplicate any of these definitions; derive from the source instead.
3. **Published surface.** Publish state is **runtime** (DB-backed, admin-toggleable) and covers **calculators AND trackers** (`backend/publishable.py` = `VALID_CALC_TYPES` + tracker slugs). Every user-facing enumeration (nav, grids, tabs, routing guards) derives from the single runtime source — `usePublishedTypes` / `usePublishedCalculators` (calculators) and `useLiveTrackers` / `useVisibleUpcoming` (trackers, in `frontend/src/trackers.js`), all reading `GET /api/calculators/published` via `usePublished.js`, falling back to the registry's `DEFAULT_PUBLISHED_*` exports if the fetch fails. There is **no `featureFlags.js`** — the old build-time tracker flags were removed; tracker reveal is an admin toggle. Never re-filter the full `CALCULATORS` list in a consumer and never maintain a second list. `backend/calc_types.py` keeps ALL types valid regardless of published state, and `DEFAULT_PUBLISHED_TYPES` seeds the `calculator_publish` table — saved rows for unpublished calculators must remain loadable. See DECISIONS.md § "Runtime publish state — DB-backed, admin-toggleable".
4. **No raw `fetch` in feature modules.** All HTTP goes through `httpClient.createApi(baseUrl)` via a module in `src/api/`. CSRF injection is handled there.
5. **Every opaque client saved-data blob has `version: 1`** as its first field and a migration path in `frontend/src/utils/migrateCalcData.js`. This governs serialized blobs (calculator inputs, Sankey permalinks, any future saved dashboard/tracker *blob*) that are stored opaquely and migrated on load — no exceptions there. It does **not** govern first-class normalised tables with typed columns (e.g. the Net Worth tracker's `nw_*` tables), which evolve via idempotent DDL migrations in `db_init.py` instead. See DECISIONS.md § "Net Worth Tracker".
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
- Releases: see § Release ritual. (`develop`→`main` as a merge commit, then push an **annotated** tag; the Action publishes the Release.)

## Task tracking

Per-task execution lives on the GitHub Project "spreadsheetmillionaire.com"; **cycle grouping lives on Milestones**. Backlog lives on the board; a task joins a cycle when it's assigned to that cycle's milestone.

- **Milestone = release cycle**, named for its target version (`v0.9.0`). Keep **exactly one milestone open at a time** — the discipline the Session protocol relies on. Its description is the cycle goal, set once when you open it. Closed issues in it = done-this-cycle; open = remaining.
- Issues auto-flow into the board's Backlog via the Auto-add workflow — create well-formed issues; don't add to the board by hand. Closed cards **auto-archive**; never create an "Archived" status or move cards by hand.
- **When to file:** anything not finished this session; bugs, security concerns, tech debt, or gaps you notice. Not for trivial fixes done immediately.
- **Before filing:** `gh issue list --search "<keywords>"` to avoid duplicates.
- **Title:** imperative ("Gate Sankey calculator export behind paid tier"). **Body:** Context (with file paths) / Acceptance criteria / Notes.
- **Labels** (one of each): type `type:feature|bug|chore|refactor|docs|security`, priority `prio:high|med|low`.
- **Create** (into the current cycle): `gh issue create -t "<title>" -b "<body>" -l "type:bug,prio:high" --milestone "v0.9.0"`
- Patches skip milestones — a patch issue needs no milestone.

## Roadmap & tasks — who owns what

Three non-overlapping owners that never restate each other:

- **`project.md`** — the phase-level plan, the durable phase-log *index* (one line per release → links to `docs/releases/`), and a one-line editorial **Current cycle** pointer for at-a-glance reading in the editor.
- **The open Milestone** — the canonical *live* cycle (scope + done/remaining). If the pointer and the milestone disagree, **the milestone wins** — fix the pointer.
- **The Project board** — per-task status + backlog.

Never restate per-task status in `project.md`; never restate release-note detail in the phase log (link to the release file). The owner plans phases in `project.md` — don't invent phases, and promote only the current cycle's issues into a milestone (never materialize all future phases up front).

## Release ritual

Two flows, one automated tail. The GitHub Release is created by `.github/workflows/release.yml` **on tag push — never by hand**, so it can't be forgotten (this was the previously-missing step).

> **Ordering rule (non-negotiable):** the `docs/releases/vX.Y.Z.md` notes file must be committed and merged onto the tagged commit **before** the tag is pushed, or the Action has nothing to publish (it will fail loudly if the file is absent).

### Cycle release (phase, `vX.Y.0`)

Precondition: the open milestone's issues are all closed.

1. Write `docs/releases/vX.Y.0.md` from the cycle's closed issues (the real work). File starts with an H1 — `# vX.Y.0 — <title> (<date>)` — which becomes the Release title.
2. Update `project.md`: a **one-line** phase-log entry (`<date> · vX.Y.0 · <summary>` → link to the release file), move the cycle to Shipped, advance the *Current cycle* pointer. Do NOT restate the notes.
3. Update `README.md` only if user-facing facts changed (calculators, stack).
4. Open the `develop`→`main` PR (**merge commit**, never squash), summarizing the cycle.
5. **[Your gate]** Review + merge the PR, then push the **annotated** tag on the resulting `main` commit:
   `git checkout main && git pull && git tag -a vX.Y.0 -m "vX.Y.0 — <summary>" && git push origin vX.Y.0`
   Pushing the tag is the ship-it approval.
6. *(automated)* The Action publishes the GitHub Release from `docs/releases/vX.Y.0.md` and closes the milestone titled `vX.Y.0`.

### Patch release (`vX.Y.Z`, Z > 0 — no milestone)

1. Fix on `feature/*` or `fix/*`; PR to `develop` (**squash**).
2. Write `docs/releases/vX.Y.Z.md`.
3. Update `project.md`'s Patch-releases table (one line).
4. PR `develop`→`main` (**merge commit**).
5. **[Your gate]** Merge + push the annotated tag `vX.Y.Z` (as above).
6. *(automated)* The Action publishes the Release. No milestone to close.

## Known flakes (don't chase these)

- Stale CSRF token after a Flask restart: first mutating request 403s. Known issue; a page refresh re-fetches the token. Not a bug to fix mid-task.

## Working style

- Before any non-trivial change, state the plan: which files change, which are new, where each lives. Then write.
- Complete, production-ready code. No `// add your logic here`, no truncated snippets.
- When an error occurs, diagnose from the stack trace: exact file, exact line, exact fix.
