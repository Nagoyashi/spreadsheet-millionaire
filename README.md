# FINtrackr

A personal-finance web app. Use the calculators without an account; sign in to save your inputs. Net worth and income/expense trackers coming soon, with a freemium tier for advanced features.

**Current calculators:** FIRE, Compound Interest, Cash Flow Sankey, Investment Fee Impact, Inflation, Dividend, Withdrawal Plan, Debt Payoff, Mortgage, Coast FIRE, Emergency Fund, Barista FIRE.

---

## Stack

Flask 3 · React 18 + Vite · SQLite (raw SQL, no ORM) · Tailwind CSS · Recharts + d3-sankey · Marshmallow · bcrypt · Flask-Session · Flask-Limiter · Flask-Talisman

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
| `DATABASE_PATH` | `fintrackr.db` | `fintrackr.db` |
| `SESSION_COOKIE_SECURE` | `False` | `True` |
| `RATELIMIT_STORAGE_URI` | `memory://` | `redis://...` for multi-process |

---

## Where to learn more

- **`PROJECT_STRUCTURE.md`** — full file tree, conventions, and how-to recipes (adding a calculator, adding an API namespace, versioning saved data)
- **`DECISIONS.md`** — the *why* behind every architectural choice, with conditions for when to revisit
- **`INSTRUCTIONS.md`** — context for the AI assistant working on this codebase

---

## Deployment checklist

- [ ] Generate a real `FLASK_SECRET_KEY`
- [ ] Set `FLASK_ENV=production`
- [ ] Set `SESSION_COOKIE_SECURE=True`
- [ ] Update `CORS_ORIGINS` to the deployed frontend URL
- [ ] Switch `RATELIMIT_STORAGE_URI` to Redis if running multiple workers
- [ ] Switch `SESSION_TYPE` to Redis if running multiple workers
- [ ] Run `python db_init.py` on the server before first boot
