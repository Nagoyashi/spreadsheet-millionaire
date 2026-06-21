# SpreadsheetMillionaire

A personal-finance web app. Use the calculators without an account; sign in to save your inputs.

**Public MVP calculators:** FIRE, Compound Interest, Emergency Fund, Debt Payoff.

Every calculator is robust to extreme or invalid input: numeric fields are bounded and clamped at the shared input component, so out-of-range or pasted values can't produce `Infinity`/`NaN`, broken charts, or overflowing figures. See `DECISIONS.md` § "Numeric input is bounded and clamped at the shared component".

---

## Stack

Flask 3 · React 18 + Vite · PostgreSQL on Neon (raw SQL via psycopg, no ORM) · Redis on Upstash (sessions + rate limiting) · Resend (transactional email) · Tailwind CSS · Recharts + d3-sankey · Marshmallow · bcrypt · Flask-Session · Flask-Limiter · Flask-Talisman

---

## Local development

### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate                              # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env                                  # then edit and set FLASK_SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"   # generate a key

python db_init.py                                     # initialise the database
python app.py                                         # http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                                           # http://localhost:5173
```

Vite proxies `/api/*` to the Flask backend on `:5000`.

---

## Environment variables

Create `backend/.env`. The app **will not start** if `FLASK_SECRET_KEY` is missing or set to the placeholder.

| Variable | Dev value | Prod value |
|----------|-----------|------------|
| `FLASK_SECRET_KEY` | output of `secrets.token_hex(32)` | same — app exits if missing/placeholder |
| `FLASK_ENV` | `development` | `production` |
| `CORS_ORIGINS` | `http://localhost:5173` | deployed frontend URL |
| `DATABASE_URL` | Neon **dev branch** pooled URL (`postgres://…`) | Neon **main branch** pooled URL — app exits if missing / not Postgres |
| `REDIS_URL` | Upstash `rediss://…` (optional in dev — unset falls back to filesystem sessions + in-memory limiting) | Upstash `rediss://…` — **required**; app exits without it |
| `RESEND_API_KEY` | Resend key (optional — unset disables email) | Resend key (email disabled with a warning if unset) |
| `MAIL_FROM` | sender address, e.g. `noreply@spreadsheetmillionaire.com` | same |
| `APP_BASE_URL` | `http://localhost:5173` | public frontend origin — used to build password-reset links |
| `SESSION_COOKIE_SECURE` | `False` | `True` |

**Frontend** (`frontend/.env` locally, or the Vercel project env):

| Variable | Dev value | Prod value |
|----------|-----------|------------|
| `VITE_NETWORTH_ENABLED` | unset (on under `vite dev`) | unset = **off** (Net Worth tracker ships dark — production shows "Coming soon"). Set `true` on staging to reveal it. |
| `VITE_INCOME_EXPENSE_ENABLED` | unset (on under `vite dev`) | unset = **off** (Income & Expense tracker ships dark). Set `true` on staging to reveal it. |

> `DATABASE_URL` must point at Neon's **pooled** (PgBouncer) endpoint — pooling happens there, not in-process; `sslmode=require` is appended automatically if absent. In dev, leaving `REDIS_URL` unset runs with zero extra infrastructure (filesystem sessions + `memory://` rate limiting); the rate limiter derives its store from `REDIS_URL` (there is no separate `RATELIMIT_STORAGE_URI`).

---

## Where to learn more
This is the **canonical documentation map** — every other file links here rather than restating it.

- **`project.md`** — the roadmap: vision, phase plan, and the durable phase log. Live cycle state lives on GitHub Milestones; per-task status on the Project board.
- **`STATUS.md`** — technical reference: tech stack, providers, architecture, data model, and the full API documentation
- **`PROJECT_STRUCTURE.md`** — full file tree, route map, conventions, and how-to recipes (adding a calculator, adding an API namespace, versioning saved data)
- **`DECISIONS.md`** — the *why* behind every architectural choice, with conditions for when to revisit
- **`docs/DEPLOYMENT.md`** — Render + Vercel deploy runbook (env tables, smoke test)
- **`docs/releases/`** — per-release notes (`vX.Y.Z.md`); the durable record stays in `project.md`'s phase log
- **`CLAUDE.md`** — context and hard rules for the AI assistant working on this codebase

---

## Deployment checklist

- [ ] Generate a real `FLASK_SECRET_KEY`
- [ ] Set `FLASK_ENV=production`
- [ ] Set `SESSION_COOKIE_SECURE=True`
- [ ] Point `DATABASE_URL` at the Neon **main branch** pooled URL
- [ ] Set `REDIS_URL` (Upstash) — required in production for shared sessions + rate limiting across workers
- [ ] Set `RESEND_API_KEY` + `MAIL_FROM` for transactional email
- [ ] Update `CORS_ORIGINS` and `APP_BASE_URL` to the deployed frontend origin
- [ ] Run `python db_init.py` on the server before first boot
