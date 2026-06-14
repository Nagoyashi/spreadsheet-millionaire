// Vercel Edge Middleware — environment-driven API proxy.
//
// Replaces the old static `/api/*` rewrite in vercel.json, whose `destination`
// was a hardcoded backend URL committed to the repo — so it travelled with the
// branch and was identical in every Vercel environment. That meant a staging
// (Preview) frontend would proxy to the production backend, or vice versa.
//
// Vercel's static `vercel.json` rewrites cannot read environment variables in a
// `destination`, so the proxy target moves here, to the edge, where it CAN.
// The backend origin comes from BACKEND_ORIGIN, read at request time, so Vercel
// scopes it per-environment:
//   Production scope → production Render URL
//   Preview scope    → staging Render URL
// Same code, correct backend in both. See DECISIONS.md
// § "API proxy target is environment-driven".
//
// BACKEND_ORIGIN is server/edge-only (NOT VITE_-prefixed), so the backend URL
// never enters the client JS bundle — only this edge function ever reads it.
//
// Local dev does NOT run this: Vite's dev proxy (vite.config.js) handles
// /api → localhost:5000. The matcher scopes the middleware to /api/* only;
// every other path falls through to the SPA fallback in vercel.json.

export const config = {
  // Intercept API calls only. SPA routes are served by vercel.json's fallback.
  matcher: '/api/:path*',
}

export default function middleware(request) {
  const origin = process.env.BACKEND_ORIGIN

  // Fail loudly rather than silently proxying nowhere — matches the project's
  // loud-failure posture (the backend's config.py exits on a missing secret).
  if (!origin) {
    console.error(
      'BACKEND_ORIGIN is not set — the API proxy has no backend to forward to. ' +
        'Set it in the Vercel project for both the Production and Preview scopes ' +
        '(see docs/DEPLOYMENT.md).'
    )
    return new Response('API proxy misconfigured: BACKEND_ORIGIN is not set.', {
      status: 502,
      headers: { 'content-type': 'text/plain' },
    })
  }

  // Keep the full /api/... path and query exactly; only the origin changes.
  // A trailing slash on BACKEND_ORIGIN is harmless — URL() normalises it, and
  // the absolute pathname replaces any path component on the origin.
  const incoming = new URL(request.url)
  const destination = new URL(incoming.pathname + incoming.search, origin)

  // Rewrite (server-side proxy), NOT a redirect: the browser keeps talking to
  // the Vercel origin, so the session cookie stays first-party — the whole
  // point of the single-origin design (DECISIONS.md § "Single-origin
  // deployment via Vercel rewrite proxy"). Setting `x-middleware-rewrite` is
  // exactly what @vercel/edge's `rewrite()` helper does, with no dependency.
  return new Response(null, {
    headers: { 'x-middleware-rewrite': destination.toString() },
  })
}
