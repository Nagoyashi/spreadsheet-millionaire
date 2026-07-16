// Route-level gate for marketing-surface drafts (Guide / Comparison / ETFs &
// Stocks). A logged-in superadmin sees the new draft page; everyone else —
// anonymous visitors and normal (even admin) users — keeps seeing the existing
// coming-soon page, unchanged. The superadmin flag comes from the session user
// (auth/status → user.is_superadmin), the same field the admin portal gates on.
//
// UI-layer gating is deliberate and sufficient here: these are static marketing
// pages whose content is local placeholder data — no backend data or paid
// capability is exposed, so there is nothing server-side to protect. (Paid
// features are different: those are gated at three layers per CLAUDE.md Hard
// Rule #8. This is a content preview, not an entitlement.)
//
// When a page ships publicly, unwrap its route in App.jsx and drop the banner.
export default function SuperadminPreview({ auth, preview, fallback }) {
  return auth?.user?.is_superadmin ? preview : fallback
}

// Slim notice rendered directly under the nav on each preview page, so the
// founder never mistakes a draft for the public surface. The pages are only
// ever mounted through <SuperadminPreview>, so the banner always means
// "you are seeing this because you're a superadmin".
export function SuperadminPreviewBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-100 px-6 py-2 text-center text-[13px] text-amber-700">
      Superadmin preview — public visitors still see the coming-soon page.
    </div>
  )
}
