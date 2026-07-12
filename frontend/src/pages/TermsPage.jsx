// Terms of Service. Load-bearing clause: "educational tools, not financial advice".
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import LegalLayout from '../marketing/LegalLayout'
import { CONTACT_EMAIL } from '../marketing/links'

export default function TermsPage({ auth }) {
  useDocumentTitle('Terms of Service — SpreadsheetMillionaire')

  return (
    <LegalLayout auth={auth} title="Terms of Service" updated="12 July 2026">
      <p>
        These terms govern your use of SpreadsheetMillionaire (the "service"). By using
        the service, you agree to them. If you don't agree, please don't use the service.
      </p>

      <h2>Not financial advice</h2>
      <p>
        <strong>The calculators and trackers are educational planning tools, not
        financial advice.</strong> The calculators produce estimates from the numbers and
        assumptions you provide, and those assumptions (rates of return, inflation,
        timelines) are inherently uncertain; the trackers simply organise and display
        figures you enter yourself. Nothing on this service is personalised investment,
        tax, legal, or financial advice, and nothing here should be relied on as such.
        For decisions that matter, consult a qualified professional who knows your full
        situation.
      </p>

      <h2>The service is provided "as is"</h2>
      <p>
        The service is provided "as is" and "as available", without warranties of any
        kind, whether express or implied — including fitness for a particular purpose,
        accuracy of calculations, or uninterrupted availability. We work to keep it
        correct and online, but we don't guarantee it will be either.
      </p>

      <h2>Your account</h2>
      <p>
        You're responsible for keeping your password secure and for activity under your
        account. Provide a valid email address, don't impersonate others, and don't share
        your credentials. Tell us promptly if you believe your account has been accessed
        without your permission.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the service to break the law or infringe anyone's rights.</li>
        <li>Attempt to disrupt, overload, probe, or gain unauthorised access to the service
          or its infrastructure.</li>
        <li>Scrape, resell, or redistribute the service in a way that competes with it or
          misrepresents it as your own.</li>
        <li>Upload malicious content or interfere with other people's use of the service.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        The data you save — calculations and tracker entries alike — remains yours. By
        saving it you simply allow us to store and display it back to you as part of
        running the service. You can delete individual entries, download everything as a
        single file, or delete your whole account and all its data, at any time from the
        settings page.
      </p>

      <h2>Termination</h2>
      <p>
        You may stop using the service and delete your account at any time. We may suspend
        or terminate access if you breach these terms or use the service in a way that
        risks harm to it or to others. On termination, your right to use the service ends.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, SpreadsheetMillionaire will not be liable
        for any indirect, incidental, or consequential damages, or for any financial loss
        arising from decisions you make based on the calculators' output. The service is
        a planning aid; the decisions, and their outcomes, are yours.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms from time to time. When we do, we'll change the "last
        updated" date above. Continuing to use the service after a change means you accept
        the updated terms.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of <strong>the Federal Republic of Germany</strong>,
        without regard to conflict-of-laws principles.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Email us at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalLayout>
  )
}
