import { Link } from 'react-router-dom'

// Presentational shell for the auth-family pages: the gray full-height page,
// the top bar with the logo, and the centered white card with a badge, title,
// subtitle, and footer line. It owns NO form mechanics — callers drop their own
// form (or any content) in as children.
//
// Why this exists:
//   AuthForm was built for the login/register pair, which share an identical
//   email+password form. Forgot-password (email only) and reset-password
//   (password + confirm, no email) are the same visual family but a different
//   field set, so they can't reuse AuthForm's hardcoded fields. Extracting just
//   the chrome lets every auth page look identical without forcing the two
//   highest-traffic pages (login/register) through a field-driven rewrite.
//   AuthForm itself now renders its form inside this shell.
//
// Props:
//   badge / badgeClass — pill at the top of the card (e.g. "Welcome back")
//   title              — h1
//   subtitle           — muted line under h1
//   footer             — JSX for the bottom line (links to other auth pages)
//   children           — the form / body content

export default function AuthCardShell({ badge, badgeClass, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <Link to="/" className="text-xl font-bold text-gray-800 tracking-tight">
          Spreadsheet<span className="text-amber-400">Millionaire</span>
        </Link>
      </header>

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-sm">
          <div className="mb-6">
            {badge && (
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${badgeClass}`}>
                {badge}
              </span>
            )}
            <h1 className="text-3xl font-bold text-gray-800 mt-3">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>

          {children}

          {footer && (
            <p className="text-sm text-gray-500 mt-6 text-center">
              {footer}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
