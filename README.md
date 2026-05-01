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
│   ├── schemas/         # Marshmallow validation (imports calc_types)
│   ├── utils/           # auth_helpers (login_required, csrf_protect, session helpers)
│   ├── app.py           # Flask factory
│   ├── calc_types.py    # Single source of truth for VALID_CALC_TYPES
│   ├── config.py        # All config from .env
│   └── db_init.py       # Schema creation + migrations (imports calc_types)
└── frontend/
    └── src/
        ├── calculators/ # One file per calculator + registry.js
        ├── components/  # CalculatorSidebar, CalculatorHeader, ui/ primitives (StatCard, NumInput, CalculatorSkeleton, etc.)
        ├── hooks/       # useAuth, useCalculatorData, useCalculatorInputs, useSave, useFavourites
        ├── pages/       # LandingPage, CalculatorPage, LoginPage, RegisterPage
        ├── api/         # authApi, calculatorApi
        ├── utils/       # format (shared fmt), migrateCalcData (saved-data versioning)
        └── constants.js # Shared storage key generators
```

Full structure and architectural conventions: see `PROJECT_STRUCTURE.md`.

---

## Adding a New Calculator

1. Create `frontend/src/calculators/YourCalculator.jsx` — must accept `{ initialData, onDataChange }` props. Use the `useCalculatorInputs` hook for input state.
2. Add `version: 1` as the first field in your `DEFAULTS` object.
3. Add one entry to `frontend/src/calculators/registry.js`.
4. Add the type string to `VALID_CALC_TYPES` in `backend/calc_types.py` (single source — the schema and `db_init.py` both import from here).
5. Run `python db_init.py` to migrate the database constraint.

### Calculator component pattern

```jsx
import { useCalculatorInputs } from '../hooks/useCalculatorInputs'
import { fmt } from '../utils/format'

const DEFAULTS = {
  version: 1,                   // required — used by the migration system
  some_input: 1000,
  // ...
}

export default function YourCalculator({ initialData, onDataChange }) {
  const { inputs, set } = useCalculatorInputs({
    defaults: DEFAULTS,
    initialData,
    onDataChange,
    calcType: 'your_calc_type',
  })

  // use `set('some_input')` for scalar inputs
  // use `setInputs(prev => ...)` (also returned) for nested array operations
  // use `fmt(value)` for currency formatting — never write a local fmt()
}
```

---

## Saved Data Versioning

Saved calculator data is stored as opaque JSON. When you change an input shape (rename a field, change units, add a required field), bump the version and add a migration so existing saved records continue to load.

1. Bump `DEFAULTS.version` in the calculator (e.g. `1` → `2`).
2. Add a migration step in `frontend/src/utils/migrateCalcData.js`:
   ```js
   const MIGRATIONS = {
     fire: {
       2: (data) => ({
         ...data,
         savings_pct: data.savings_rate,        // rename
         savings_rate: undefined,
       }),
     },
   }
   ```
3. Old records load through the migration automatically. The internal `__v` key is stripped before the data is sent to the backend, so stored JSON stays clean.

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