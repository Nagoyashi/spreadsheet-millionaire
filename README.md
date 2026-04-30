# FINtrackr

A lightweight financial calculator web app. Use any calculator without an account. Sign in to save, rename, reload, and manage your calculations.

**Live calculators:** FIRE, Compound Interest, Cash Flow Sankey, Investment Fee Impact, Inflation, Dividend, Withdrawal Plan, Debt Payoff, Mortgage, Coast FIRE, Emergency Fund, Barista FIRE.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Charts | Recharts + d3-sankey |
| Backend | Flask 3 |
| Database | SQLite (raw SQL, no ORM) |
| Auth | Flask-Session (server-side, filesystem-backed) |
| Validation | Marshmallow |
| Security | Flask-Limiter + Flask-Talisman + bcrypt + CSRF tokens |

---

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set up environment
cp .env.example .env            # then edit .env and set FLASK_SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"  # generate a key

# Initialise the database
python db_init.py

# Start the server
python app.py
```

Backend runs on `http://localhost:5000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`. API calls are proxied to `:5000` via Vite.

---

## Environment Variables

Create `backend/.env` from the template below. The app **will not start** if `FLASK_SECRET_KEY` is missing or set to the placeholder.

```env
FLASK_SECRET_KEY=<output of secrets.token_hex(32)>
FLASK_ENV=development
CORS_ORIGINS=http://localhost:5173
DATABASE_PATH=fintrackr.db
SESSION_COOKIE_SECURE=False
RATELIMIT_STORAGE_URI=memory://
```

---

## Project Structure

```
money-calculators/
├── backend/
│   ├── models/          # User, SavedCalculator
│   ├── routes/          # auth.py, calculators.py
│   ├── schemas/         # Marshmallow validation
│   ├── utils/           # auth_helpers (login_required, csrf_protect, session helpers)
│   ├── app.py           # Flask factory
│   ├── config.py        # All config from .env
│   └── db_init.py       # Schema creation + migrations
└── frontend/
    └── src/
        ├── calculators/ # One file per calculator + registry.js
        ├── components/  # CalculatorSidebar, ui/ primitives (StatCard, NumInput, etc.)
        ├── hooks/       # useAuth, useCalculatorData, useSave, useFavourites
        ├── pages/       # LandingPage, CalculatorPage, LoginPage, RegisterPage
        ├── api/         # authApi, calculatorApi
        └── constants.js # Shared storage key generators
```

Full structure and architectural conventions: see `PROJECT_STRUCTURE.md`.

---

## Adding a New Calculator

1. Create `frontend/src/calculators/YourCalculator.jsx` — must accept `{ initialData, onDataChange }` props
2. Add one entry to `frontend/src/calculators/registry.js`
3. Add the type string to `VALID_CALC_TYPES` in `backend/schemas/calculator_schema.py` and `backend/db_init.py`
4. Run `python db_init.py` to migrate the database constraint

---

## Security

- **Passwords** — bcrypt hashed, 8+ chars with letter + number required
- **Sessions** — server-side filesystem sessions, signed cookie, 30-day expiry
- **CSRF** — token issued on app load, stored in JS memory, verified as `X-CSRF-Token` header on every mutating request
- **Rate limiting** — 5/min + 20/hr on login, 10/hr on register, 5/hr on account deletion
- **IDOR** — every DB query on saved calculations includes `AND user_id = ?`
- **Headers** — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, HTTPS redirect in production
- **Account deletion** — password re-confirmation required, cascades to all user data
- **Config** — app exits at startup if secret key is invalid

---

## Deployment Checklist

- [ ] Generate a real `FLASK_SECRET_KEY`
- [ ] Set `FLASK_ENV=production`
- [ ] Set `SESSION_COOKIE_SECURE=True`
- [ ] Update `CORS_ORIGINS` to your deployed frontend URL
- [ ] Switch `RATELIMIT_STORAGE_URI` to Redis if running multiple workers
- [ ] Run `python db_init.py` on the server before first boot