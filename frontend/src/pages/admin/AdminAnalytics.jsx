import { BarChart3 } from 'lucide-react'

// Placeholder — Analytics (GA4 Data API server-side proxy) is a later phase of
// the v0.12.0 cycle (#152). Rendered so the tab exists; wired when GA4 creds land.
export default function AdminAnalytics() {
  return (
    <div>
      <h1 className="text-[26px] font-extrabold tracking-[-0.5px]">Analytics</h1>
      <p className="text-sm font-medium text-[#6b7280] mt-1">Usage & conversion, from Google Analytics 4.</p>
      <div className="mt-6 bg-white rounded-[14px] border border-[#e8ebee] p-10 grid place-items-center text-center">
        <BarChart3 className="w-8 h-8 text-[#b0b6bd]" />
        <p className="mt-3 text-sm font-semibold text-[#6b7280]">Analytics lands in a later phase</p>
        <p className="mt-1 text-[13px] text-[#9aa0a8] max-w-sm">
          GA4 visitors, signups, traffic sources, and the conversion funnel will appear here once
          the GA4 Data API proxy is wired (needs a property ID + service-account key).
        </p>
      </div>
    </div>
  )
}
