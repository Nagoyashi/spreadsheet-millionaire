// Imprint / "Impressum" — operator disclosure required for commercial sites in
// several EU jurisdictions (notably Germany, §5 DDG / §18 MStV).
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import LegalLayout from '../marketing/LegalLayout'
import { CONTACT_EMAIL } from '../marketing/links'

export default function ImprintPage({ auth }) {
  useDocumentTitle('Imprint — SpreadsheetMillionaire')

  return (
    <LegalLayout auth={auth} title="Imprint" updated="12 June 2026">
      <p>
        Information provided in accordance with applicable disclosure requirements
        (e.g. §5 DDG / §18 MStV for operators based in Germany).
      </p>

      <h2>Operator</h2>
      <p>
        <strong>Robert Madocsa Kiss</strong>
        <br />
        Dettelbacher Weg 19
        <br />
        13189, Berlin
        <br />
        Germany
      </p>

      <h2>Contact</h2>
      <p>
        Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        <br />
        Phone: +491636725914
      </p>

      <h2>Responsible for content</h2>
      <p>
        Robert Madocsa Kiss
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
