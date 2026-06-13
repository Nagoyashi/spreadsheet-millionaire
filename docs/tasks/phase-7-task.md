# Phase 7 — Input validation hardening (launch blocker)

Read `CLAUDE.md`, `PROJECT_STRUCTURE.md`, and `DECISIONS.md` in full before touching anything. Then present your plan (files changed, files added, destination paths) and wait for my approval before writing code.

## Context

Real-device testing of the four published calculators (FIRE, Compound Interest, Emergency Fund, Debt Payoff) surfaced one root cause expressed four ways: **numeric inputs are unbounded and unsanitised**, so extreme or negative values produce `Infinity`/`NaN`, blow out chart axes, overflow stat cards, and render nonsense like `Infinity×`, `NaN% of final value`, `-28571428571%`, and `$5759088369090353.00M`.

This is the **last phase before public launch**. Scope is deliberately narrow: make the four calculators *robust to bad input*. This is NOT the calculator-depth redesign — do not add input fields, change financial models, rework the savings-rate metric, or touch the avalanche/snowball logic. Those are tracked separately for post-launch. If you find yourself improving a calculation rather than bounding/sanitising its inputs, stop.

Findings from the report, mapped:

- **All four** — large numbers (e.g. `8e31`) and negative numbers accepted; charts and stat cards break.
- **Emergency Fund** — values overflow cards on desktop and the layout leaves frame on mobile.
- **Debt Payoff** — with interest rate `100%` and extra payment `316` vs `317`, total interest swings between absurd values. Root cause: at implausible rates the balance barely amortises, the payoff hits the 600-month cap, and interest compounds astronomically; one dollar flips convergence. The 600-month cap is correct; the missing **rate ceiling** is the bug.

## Part 0 — Preconditions

1. Clean tree, on `develop`, latest merged (the marketing/`/app` restructure is in). If not, stop.
2. Working branch: `feature/input-validation` off `develop`.

## Part 1 — Audit, then propose bounds (no code yet)

Read all four calculator components plus `components/ui/NumInput.jsx` and `utils/format.js` (note: `NumInput` already accepts `min`/`max` props but the calculators don't pass them and nothing clamps on change; `fmt()` already returns `$0` for non-finite input, but several calculators compute their own percentages/ratios that never pass through `fmt()` — those are where `Infinity×` and `NaN%` leak).

Produce, in the plan, a **per-field bounds table**: calculator → field → min → max → rationale. Propose sensible real-world ceilings, e.g. monetary fields `0 … 1e12`, interest/return rates `0 … 50%` (or similar — justify), years/periods `1 … 100`, ages where relevant `0 … 120`. I will approve or adjust the numbers before you write anything. Every monetary and rate field gets a `min` of `0` unless there's a real reason for negatives (there isn't, in these four).

## Part 2 — Centralise the sanitisation

The fix lives in shared code first so all four calculators inherit it; per-calculator changes are then just passing bounds.

1. **`NumInput`**: clamp on change. When the parsed value exceeds `max`, set `max`; below `min`, set `min`; non-numeric/empty → a single defined fallback (empty string that the calculator treats as 0, matching current behaviour — verify how each calc currently handles empty). The visible field must never hold a value outside `[min, max]`. Keep the native `min`/`max`/`step` attributes too (spinner + a11y), but do not rely on them alone — they don't stop typed/pasted values, which is the actual failure mode.
2. **`fmt()`**: it already guards non-finite. Add an optional clamp/`maxDigits` guard only if needed to prevent the `…00M` overflow strings; prefer fixing at the input boundary so `fmt()` never receives the garbage. Don't change default formatting behaviour.
3. **Derived-metric guard**: for the computed ratios that bypass `fmt()` (Money Multiplier, Savings Rate, Coverage %, ROI), add a small shared helper or inline guard so a `0` denominator or non-finite result renders a dash/`0`, never `Infinity`/`NaN`. One helper, reused — don't scatter `isFinite` checks ad hoc.

## Part 3 — Apply bounds per calculator

For each of the four, pass the approved `min`/`max` to every `NumInput`, and verify the calculation handles the now-bounded domain cleanly:

- **FIRE** — income, savings, rate, etc. bounded; the wealth-projection chart axis must stay finite. Do NOT add fields or change the model.
- **Compound Interest** — initial, contribution, rate, years bounded; "Money Multiplier" and "Interest %" guarded.
- **Emergency Fund** — expenses, target months, current savings, contribution, rate bounded; negative current-savings disallowed; verify cards no longer overflow and the layout holds at 375px (this also closes the mobile-overflow finding).
- **Debt Payoff** — per-debt balance/rate/min-payment bounded (rate ceiling is the key fix); extra-payment bounded; with the rate capped, confirm the 316-vs-317 instability is gone and totals are sane. Leave avalanche/snowball logic untouched.

## Part 4 — Chart safety

Wherever a Recharts/d3 axis derives its domain from computed values, clamp the domain so a still-large-but-valid input can't produce an unreadable axis (the `3e+30M` axis in the report). A reasonable upper display bound + the input ceilings together should make this impossible; verify on each chart.

## Part 5 — Documentation (same PR)

1. `PROJECT_STRUCTURE.md`: note in conventions that all calculator numeric inputs pass bounds to `NumInput`, and that `NumInput` clamps (so future calculators comply).
2. `DECISIONS.md`, house format: **"Numeric input is bounded and clamped at the shared component"** — why centralised (one fix, all calculators; future-proof), the bound ranges chosen, and explicitly that this is robustness only — calculator-model depth (more FIRE inputs, the savings-rate metric, whether avalanche/snowball comparison stays) is a separate post-launch track, noted as still-open.

## Part 6 — Verification & PR

1. `npm run build` passes; backend diff empty.
2. Reproduce-the-report checklist in the PR body, each confirmed fixed: paste `8e31` into every monetary field → no `Infinity`/`NaN`/overflow on any of the four; type a negative → rejected/clamped; Debt Payoff at rate `100%` is now impossible (capped), and at a capped rate the 316-vs-317 totals are stable; Emergency Fund holds frame at 375px.
3. Desktop appearance for valid inputs is unchanged (this is hardening, not restyling).
4. Conventional commits, e.g. `feat: clamp numeric input in shared NumInput`, `fix: guard non-finite derived metrics`, `fix: bound inputs across the four published calculators`, `docs: record input-bounding decision`.
5. Push, `gh pr create` into `develop`, do not merge.

## Guardrails

- Robustness only. No new input fields, no model changes, no savings-rate redesign, no avalanche/snowball changes — those are post-launch.
- The fix is centralised in `NumInput`/`fmt()`/one guard helper; per-calculator edits are bounds-passing + verifying, not logic rewrites.
- No new dependencies. The 8 unpublished calculators are not touched (they inherit the `NumInput` clamp for free, which is fine).
- Registry/backend untouched.
- If a calculation genuinely misbehaves within valid bounds (a real logic bug, not an input-range artefact), flag it in the PR rather than silently rewriting it — we'll triage whether it's launch-blocking or post-launch.
