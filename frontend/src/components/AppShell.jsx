import { useState } from 'react'
import AppSidebar from './AppSidebar'

// The in-app layout shell: renders the shared AppSidebar in the desktop slot and
// (below lg) in a mobile drawer, with the page content beside it. Every /app
// page wraps its content in this so the sidebar is identical everywhere — the
// dual desktop/drawer render used to be copy-pasted into each page.
//
// `sidebar` is the optional saved-calcs slot passed through to AppSidebar
// (calculator page only). `children` is a render function receiving { openSidebar }
// so each page can wire its own mobile hamburger without prop-drilling a setter.
//
//   <AppShell auth={auth} sidebar={savedCalcsSlot}>
//     {({ openSidebar }) => ( ...page content, hamburger calls openSidebar... )}
//   </AppShell>

export default function AppShell({ auth, sidebar = null, children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const openSidebar = () => setMobileOpen(true)
  const closeSidebar = () => setMobileOpen(false)

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar — pinned full-height so it stays while content scrolls */}
      <div className="hidden lg:block sticky top-0 h-screen self-start">
        <AppSidebar auth={auth}>{sidebar}</AppSidebar>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <AppSidebar auth={auth} onClose={closeSidebar}>
            {sidebar}
          </AppSidebar>
          <div className="flex-1 bg-black/50" onClick={closeSidebar} />
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 flex flex-col bg-gray-100 min-h-screen overflow-x-hidden">
        {children({ openSidebar })}
      </div>
    </div>
  )
}
