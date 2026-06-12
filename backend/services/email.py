"""
services/email.py
-----------------
Transactional email via Resend.

Email is best-effort this phase: if RESEND_API_KEY is unset, sending is DISABLED
— send_email becomes a no-op that logs and returns False. Nothing yet depends on
email for availability (registration must never fail because of it), so a missing
key is a warning at startup (emitted from config.py), not a hard failure. That
posture changes when password reset lands.

`send_email` never raises — callers treat delivery as fire-and-forget.

Domain note: until spreadsheetmillionaire.com is verified in Resend, sends only
succeed to the Resend account owner's own address. Verifying the domain (DNS) is
a human task, not a code one.
"""

import logging
import os

import resend

logger = logging.getLogger(__name__)

_API_KEY      = os.getenv("RESEND_API_KEY", "").strip()
MAIL_FROM     = os.getenv("MAIL_FROM", "").strip()
EMAIL_ENABLED = bool(_API_KEY)

if EMAIL_ENABLED:
    resend.api_key = _API_KEY


def send_email(to: str, subject: str, html: str) -> bool:
    """
    Send a single transactional email.

    Returns True on a successful send, False if email is disabled or the send
    failed. Never raises — email is best-effort and must not break callers.
    """
    if not EMAIL_ENABLED:
        logger.warning("Email disabled (RESEND_API_KEY unset); skipped send to %s", to)
        return False

    try:
        resend.Emails.send({
            "from":    MAIL_FROM,
            "to":      [to],
            "subject": subject,
            "html":    html,
        })
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to)
        return False


def send_welcome_email(to_email: str) -> bool:
    """Send the post-registration welcome email. Best-effort (see send_email)."""
    subject = "Welcome to SpreadsheetMillionaire"
    html = """
        <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
          <h1 style="font-size: 20px; margin-bottom: 8px;">Welcome to SpreadsheetMillionaire 🎉</h1>
          <p style="font-size: 15px; line-height: 1.6;">
            Your account is ready. You can now save, rename, and reload your
            calculations across every published calculator.
          </p>
          <p style="font-size: 15px; line-height: 1.6;">
            Jump back in and start planning your path to financial independence.
          </p>
          <p style="font-size: 13px; color: #6b7280; margin-top: 24px;">
            You're receiving this because you created an account on SpreadsheetMillionaire.
          </p>
        </div>
    """
    return send_email(to_email, subject, html)


def send_password_reset_email(to_email: str, reset_url: str) -> bool:
    """
    Send the password-reset link. Best-effort (see send_email).

    The reset_url carries the raw, single-use token and must never be logged.
    send_email logs only the recipient address on failure, never the body.
    """
    subject = "Reset your SpreadsheetMillionaire password"
    html = f"""
        <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
          <h1 style="font-size: 20px; margin-bottom: 8px;">Reset your password</h1>
          <p style="font-size: 15px; line-height: 1.6;">
            We received a request to reset the password for your
            SpreadsheetMillionaire account. Click the link below to choose a new one:
          </p>
          <p style="font-size: 15px; line-height: 1.6;">
            <a href="{reset_url}" style="color: #2563eb;">Reset my password</a>
          </p>
          <p style="font-size: 13px; color: #6b7280; line-height: 1.6;">
            This link expires in 60 minutes and can only be used once.
          </p>
          <p style="font-size: 13px; color: #6b7280; margin-top: 24px;">
            If you didn't request this, you can safely ignore this email — your
            password won't change.
          </p>
        </div>
    """
    return send_email(to_email, subject, html)
