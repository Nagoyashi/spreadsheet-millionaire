# SpreadsheetMillionaire

A personal-finance web app. Use the calculators without an account; sign in to save your inputs. Net worth and income/expense trackers coming soon, with a freemium tier for advanced features.

**Public MVP calculators:** FIRE, Compound Interest, Emergency Fund, Debt Payoff.

---

## Roadmap

Built in public — features land incrementally, and most of what's next already exists in the codebase waiting to be switched on.

**More calculators (already written, behind a `published` flag).** Eight beyond the MVP — Cash Flow Sankey, Investment Fee Impact, Inflation, Dividend, Withdrawal Plan, Mortgage, Coast FIRE, and Barista FIRE — re-enable one at a time as build-in-public patches by flipping the flag in the calculator registry. Saved data for them is already valid server-side; only the public surface is gated.

**Trackers — the next major surface.**
- **Net Worth Tracker** — log what you own and owe, and watch your net worth trend over time.
- **Income & Expense Tracker** — categorise what comes in and goes out, and see where your money actually goes each month.

Each gets its own pages, API namespace, and database tables. Teasers already appear in the app (the "Coming soon" cards) and on the marketing page.

**Accounts & platform.**
- A freemium tier gating advanced features (the trackers' richer slices).
- Settings expansion: currency preference, language / i18n, and email verification on change.

The public marketing site lives at `/`; the app is namespaced under `/app/*`.

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

> `DATABASE_URL` must point at Neon's **pooled** (PgBouncer) endpoint — pooling happens there, not in-process. In dev, leaving `REDIS_URL` unset runs with zero extra infrastructure (filesystem sessions + `memory://` rate limiting).

---

## Where to learn more

- **`STATUS.md`** — technical reference: tech stack, providers, architecture, data model, and the full API documentation
- **`PROJECT_STRUCTURE.md`** — full file tree, route map, conventions, and how-to recipes (adding a calculator, adding an API namespace, versioning saved data)
- **`DECISIONS.md`** — the *why* behind every architectural choice, with conditions for when to revisit
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
