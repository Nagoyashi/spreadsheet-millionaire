import { Users } from 'lucide-react'

// Placeholder — the Users tab (search, Free/Pro/Elite tier control, suspend/
// reinstate, audit log) is a later phase of the v0.12.0 cycle (#151). It needs
// new users.tier / users.suspended columns + an admin_audit_log table.
export default function AdminUsers() {
  return (
    <div>
      <h1 className="text-[26px] font-extrabold tracking-[-0.5px]">User Management</h1>
      <p className="text-sm font-medium text-[#6b7280] mt-1">Accounts, tiers, and suspension.</p>
      <div className="mt-6 bg-white rounded-[14px] border border-[#e8ebee] p-10 grid place-items-center text-center">
        <Users className="w-8 h-8 text-[#b0b6bd]" />
        <p className="mt-3 text-sm font-semibold text-[#6b7280]">User management lands in a later phase</p>
        <p className="mt-1 text-[13px] text-[#9aa0a8] max-w-sm">
          Searchable accounts with Free/Pro/Elite tier control and suspend/reinstate (audit-logged)
          will appear here. Tiers/billing are off during beta.
        </p>
      </div>
    </div>
  )
}
