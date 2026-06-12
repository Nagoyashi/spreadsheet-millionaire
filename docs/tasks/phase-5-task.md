# Phase 5 — Password reset + settings page

Read `CLAUDE.md`, `PROJECT_STRUCTURE.md`, and `DECISIONS.md` in full before touching anything. Then present your plan (files changed, files added, destination paths) and wait for my approval before writing code.

## Context

The product cannot launch while a forgotten password means a permanently lost account. This task adds the full password-reset flow (request → email → reset) and a settings page housing account management: change password, change email, and the existing delete-account flow. Resend's domain is verified, so emails deliver to anyone.

This touches **auth and email — the two highest-stakes surfaces in the app**. The security requirements below are not suggestions; if any of them conflicts with making the code shorter or the UX smoother, the security requirement wins, and if you think one is wrong, stop and argue rather than quietly relaxing it.

## Part 0 — Preconditions

1. Clean tree, on `develop`, Phase 4 merged. If not, stop.
2. `backend/.env` has `RESEND_API_KEY` and `MAIL_FROM` (presence only, never print). One NEW env var is introduced this phase: `APP_BASE_URL` (the public frontend origin, e.g. the production domain — used to build reset links). Check it exists in `.env`; if missing, stop and tell me to add it (`http://localhost:5173` for dev).
3. Working branch: `feature/password-reset-and-settings` off `develop`.

## Part 1 — Token storage (backend)

Add to `backend/db_init.py`, idempotently, a `password_reset_tokens` table:

- identity PK, `user_id` FK → users `ON DELETE CASCADE`, `token_hash TEXT NOT NULL UNIQUE`, `expires_at TIMESTAMPTZ NOT NULL`, `used_at TIMESTAMPTZ NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
- **The raw token is never stored.** Generate with `secrets.token_urlsafe(32)`; store only its SHA-256 hex digest; the raw value exists only in the email link. A DB leak must not yield usable reset links.
- Lifetime: 60 minutes. Single-use: `used_at` set on consumption.
- New model `backend/models/password_reset.py` (or folded into `user.py` if that fits the codebase better — read it first): create-token, find-valid-by-hash (unexpired, unused), mark-used, invalidate-all-for-user, delete-expired.

## Part 2 — Routes (backend)

In `routes/auth.py`, matching the CSRF/limiter conventions the existing auth routes use:

1. **`POST /api/auth/forgot-password`** `{email}`:
   - **Uniform response, always**: `200 {"message": "If that email exists, a reset link has been sent."}` — identical body and timing shape whether the email exists or not. No user enumeration through this endpoint, ever.
   - If the user exists: invalidate their previous unused tokens, create a fresh one, send the email with link `{APP_BASE_URL}/reset-password/{raw_token}`. Email failure is logged and still returns the uniform 200.
   - Opportunistic cleanup: delete expired tokens (all users) on each call — no cron needed.
   - Rate limit tight: `3/hour` per IP plus a sane burst guard, in line with existing auth limits.
2. **`POST /api/auth/reset-password`** `{token, password}`:
   - Hash the token, look up valid+unused+unexpired; failure → one generic `400 invalid or expired link` (no distinguishing why).
   - New password validated by the **existing** schema rules in `user_schema.py` — reuse, don't redefine.
   - On success: update hash (bcrypt, existing helper), mark token used, invalidate all other tokens for that user. Accepted limitation to note in DECISIONS: existing logged-in sessions are not force-revoked (Redis sessions aren't indexed per-user); the password change itself is the protection.
   - Rate limit tight.
3. **`POST /api/auth/change-password`** `{current_password, new_password}` — `@login_required` + CSRF; verifies current password via bcrypt; new password through the schema; generic 401-style failure for a wrong current password.
4. **`POST /api/auth/change-email`** `{password, new_email}` — `@login_required` + CSRF; password re-confirmation; schema-validated email; `UniqueViolation` → the same error shape register uses for duplicates (and consider what that means for enumeration — match register's existing posture rather than inventing a new one).
5. **Email template**: `send_password_reset_email(to, reset_url)` in `services/email.py`, same defensive structure as the welcome email. Plain, short copy; the link; "expires in 60 minutes"; "ignore this if you didn't request it".

Every new query touching user-scoped rows carries the `user_id` filter where applicable; token lookups go by `token_hash` and join/verify the owning user. No raw tokens or emails in logs.

## Part 3 — Frontend

1. **`pages/ForgotPasswordPage.jsx`** (`/forgot-password`): single email field; after submit always show the same neutral "check your inbox" state. Link to it from the login page ("Forgot password?").
2. **`pages/ResetPasswordPage.jsx`** (`/reset-password/:token`): new-password field (+ confirm), submits token from the route param; on success, a clear "password updated" state linking to login; on 400, the generic invalid/expired message with a link to request a new one. The raw token is never persisted anywhere client-side beyond the URL/param usage.
3. Reuse the `<AuthForm>` shell for both if it bends naturally (it was built for exactly this family of pages); if it needs more than minor genericization, say so in the plan and we'll decide.
4. **`pages/SettingsPage.jsx`** (`/settings`), auth-guarded like `CalculatorPage`: shows the account email; a change-password form; a change-email form (password-confirmed); a danger zone hosting the existing `DeleteAccountModal` flow. Keep it one page, sections stacked, existing visual language, mobile floors from Phase 4 respected. Entry point: a "Settings" link in `UserFooter` (both variants).
5. `api/authApi.js`: `forgotPassword`, `resetPassword`, `changePassword`, `changeEmail` — all through the existing `createApi` client; zero raw `fetch`.

Out of scope, explicitly: language/i18n setting, currency setting, tier display, email verification on change. Settings is account-management-only this phase.

## Part 4 — Documentation (same PR)

1. `PROJECT_STRUCTURE.md`: new files, new table, the `APP_BASE_URL` env row (dev + prod values).
2. `DECISIONS.md`, house format: **"Password reset via hashed single-use tokens"** (why hash-at-rest, 60-min/single-use, uniform responses against enumeration, the session-revocation limitation) and **"Settings as a single stacked page"** (scope deliberately minimal until tier/i18n land).

## Part 5 — Verification & PR

1. `db_init.py` twice → idempotent, table present.
2. Full happy path against the dev stack with a real send to the Resend account owner's address: register → forgot-password → email arrives → link resets → old password rejected on login, new accepted.
3. Negative paths: unknown email → identical 200 body; expired token (manufacture one by editing `expires_at` in the DB) → generic 400; reused token → generic 400; wrong current password on change-password → rejected; change-email to an existing email → register-shaped duplicate error; 4th forgot-password call within the hour → 429.
4. `npm run build` passes; frontend diff is only the new pages + AuthForm/UserFooter/router touches; no calculator files changed.
5. Conventional commits per part; push; `gh pr create` into `develop` with the verification table and the one Render follow-up: **add `APP_BASE_URL` env var** (the production domain). Do not merge.

## Guardrails

- `from calc_types import ...`-style intra-backend imports; everything runs from `backend/`.
- Never print/log/commit secrets, raw tokens, or email bodies containing links.
- No new dependencies — `secrets` and `hashlib` are stdlib; Resend SDK is already in.
- No email verification flows, no magic-link login, no OAuth — resist scope creep on auth.
- If existing code contradicts these instructions, stop and ask.
