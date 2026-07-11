// Privacy Policy — written against the app's actual data practices (no ads, no
// analytics, no data sale; self-service account + data deletion).
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import LegalLayout from '../marketing/LegalLayout'
import { CONTACT_EMAIL } from '../marketing/links'

export default function PrivacyPage({ auth }) {
  useDocumentTitle('Privacy Policy — SpreadsheetMillionaire')

  return (
    <LegalLayout auth={auth} title="Privacy Policy" updated="12 June 2026">
      <p>
        This policy explains what SpreadsheetMillionaire ("we", "us") collects, why,
        and what you can do about it. We've written it against what the product
        actually does today — not a generic template. If our practices change, this
        page changes with them.
      </p>
      <p>
        <strong>The short version:</strong> you can use every calculator without an
        account and without giving us anything. We only store data when you choose to
        create an account and save your work. We don't run ads, we don't track you
        across the web, and we never sell your data.
      </p>

      <h2>What we collect</h2>
      <h3>If you only use the calculators</h3>
      <p>
        Nothing that identifies you. The calculators run entirely in your browser, and
        the numbers you type are not sent to us unless you sign in and explicitly save
        a calculation. Calculator inputs you don't save are held only in your own
        browser.
      </p>
      <h3>If you create an account</h3>
      <ul>
        <li><strong>Your email address</strong> — used to identify your account, send the
          one-time welcome email, and send password-reset links if you request one.</li>
        <li><strong>Your password</strong> — stored only as a bcrypt hash. We never store,
          log, or have access to your plaintext password.</li>
        <li><strong>Saved calculations</strong> — the inputs you choose to save, stored
          against your account so you can reload and rename them. These are the numbers
          you entered into a calculator; we don't enrich them with anything else.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We use a single, essential cookie: the session cookie that keeps you signed in
        after you log in. It is not used for advertising or cross-site tracking. Because
        we set no analytics or marketing cookies, there is no cookie consent banner —
        there is nothing non-essential to consent to.
      </p>

      <h2>Where your data is stored and who processes it</h2>
      <p>
        We keep the moving parts deliberately small. The third parties below process
        data strictly to run the service:
      </p>
      <ul>
        <li><strong>Neon (PostgreSQL)</strong> — hosts the database holding your account and
          your saved calculations.</li>
        <li><strong>Upstash (Redis)</strong> — stores your login session so you stay signed
          in across requests.</li>
        <li><strong>Resend</strong> — sends transactional email only: the welcome email and
          password-reset emails. We do not send marketing email, and there is no mailing
          list to join.</li>
        <li><strong>Render</strong> and <strong>Vercel</strong> — run the application server
          and serve the site.</li>
        <li><strong>Sentry</strong> — captures crash and error diagnostics so we can fix
          bugs. It receives technical details of an error (stack trace, browser and page)
          — never your IP address, saved calculations, or account details — and only when
          something breaks. It is not analytics and does not track your behaviour.</li>
        <li><strong>PostHog (EU&nbsp;Cloud)</strong> — privacy-preserving product analytics,
          hosted in the EU. It records a small set of aggregate product events (for example,
          that a calculator was used or an account was created) so we can see which features
          help. It uses no automatic click or keystroke capture, does not record your screen
          or sessions, and never receives your saved calculations, financial inputs, email,
          or advertising profile.</li>
      </ul>

      <h2>What we don't do</h2>
      <ul>
        <li>No advertising, ad networks, or cross-site trackers.</li>
        <li>No selling, renting, or sharing of your personal data.</li>
        <li>No session recording, no keystroke capture, and no behavioural profiling —
          product analytics is limited to the aggregate events described above.</li>
        <li>No marketing email.</li>
      </ul>

      <h2>Your rights and choices</h2>
      <p>
        We aim to honour the rights granted under the GDPR and similar laws, including
        for visitors in the EU:
      </p>
      <ul>
        <li><strong>Access and portability</strong> — your saved calculations are visible and
          reloadable in the app at any time.</li>
        <li><strong>Correction</strong> — update your email or password yourself from the
          settings page.</li>
        <li><strong>Deletion</strong> — deleting your account is self-service from settings,
          and it permanently removes your account and all of your saved calculations.
          This is immediate and cannot be undone.</li>
      </ul>
      <p>
        If you need help exercising any of these rights, contact us at the address below.
      </p>

      <h2>Data retention</h2>
      <p>
        We keep your account and saved calculations for as long as your account exists.
        When you delete your account, the associated data is removed. Password-reset
        tokens are short-lived and single-use, and expired tokens are cleared
        automatically.
      </p>

      <h2>Children</h2>
      <p>
        SpreadsheetMillionaire is not directed at children, and we don't knowingly
        collect data from anyone under the age required by their local law to consent.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If we change how we handle data, we'll update this page and its "last updated"
        date. Continued use of the service after a change means you accept the updated
        policy.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy or your data? Email us at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalLayout>
  )
}
