/*
  PLACEHOLDER IMPRINT — REQUIRES COMPLETION BEFORE LAUNCH. NOT LEGAL ADVICE.

  PR note: An imprint / "Impressum" is legally required for commercial sites in
  several EU jurisdictions (notably Germany, §5 DDG/TMG). The fields below are
  bracketed placeholders — fill in the real operator details, and have the result
  reviewed for the jurisdiction you operate in. The contact email comes from the
  shared CONTACT_EMAIL placeholder in src/marketing/links.js.
*/
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import LegalLayout from '../marketing/LegalLayout'
import { CONTACT_EMAIL } from '../marketing/links'

export default function ImprintPage({ auth }) {
  useDocumentTitle('Imprint — SpreadsheetMillionaire')

  return (
    <LegalLayout auth={auth} title="Imprint" updated="12 June 2026">
      <p>
        Information provided in accordance with applicable disclosure requirements
        (e.g. §5 DDG / §18 MStV for operators based in Germany). The details below are
        placeholders to be completed before launch.
      </p>

      <h2>Operator</h2>
      <p>
        <strong>[Full legal name or company]</strong>
        <br />
        [Street address]
        <br />
        [Postcode, City]
        <br />
        [Country]
      </p>

      <h2>Contact</h2>
      <p>
        Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        <br />
        Phone: [optional — phone number]
      </p>

      <h2>Responsible for content</h2>
      <p>
        [Name of the person responsible for content]
        <br />
        [Address, if different from the operator above]
      </p>

      <h2>VAT / registration</h2>
      <p>
        VAT identification number: [if applicable]
        <br />
        Commercial register / number: [if applicable]
      </p>

      <h2>Disclaimer</h2>
      <p>
        SpreadsheetMillionaire's calculators are educational tools, not financial
        advice. Despite careful review, we accept no liability for the accuracy,
        completeness, or timeliness of the content. For the full terms, see our{' '}
        <a href="/terms">Terms of Service</a>; for how we handle data, see our{' '}
        <a href="/privacy">Privacy Policy</a>.
      </p>
    </LegalLayout>
  )
}
