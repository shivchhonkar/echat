function NavIcon({ children }) {
  return <span className="admin-nav-icon" aria-hidden="true">{children}</span>;
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" strokeLinecap="round" />
      <path d="M6 12h12M6 8h12M6 16h12M10 6h4M10 10h4M10 14h4M10 18h4" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" strokeLinecap="round" />
      <path d="M7 16v-4M12 16V8M17 16v-6" strokeLinecap="round" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" strokeLinecap="round" />
    </svg>
  );
}

function NavItem({ icon, label, active, badge, collapsed, onClick }) {
  return (
    <button
      type="button"
      className={`admin-nav-item ${active ? "active" : ""}`}
      title={collapsed ? label : undefined}
      onClick={onClick}
    >
      <NavIcon>{icon}</NavIcon>
      {!collapsed ? <span className="admin-nav-label">{label}</span> : null}
      {!collapsed && badge != null ? <span className="admin-nav-badge">{badge}</span> : null}
    </button>
  );
}

function NavSection({ title, collapsed, children }) {
  if (collapsed) return <div className="admin-nav-section">{children}</div>;
  return (
    <div className="admin-nav-section">
      <p className="admin-nav-section-title">{title}</p>
      {children}
    </div>
  );
}

export default function SuperAdminSidebar({ tenantCount = 0, collapsed = false }) {
  return (
    <aside className={`admin-console-sidebar ${collapsed ? "collapsed" : ""}`}>
      <nav className="admin-sidebar-nav">
        <NavItem icon={<HomeIcon />} label="Dashboard" active />
        <NavSection title="TENANTS" collapsed={collapsed}>
          <NavItem icon={<BuildingIcon />} label="All Tenants" active badge={tenantCount || undefined} />
        </NavSection>
        <NavSection title="PLATFORM" collapsed={collapsed}>
          <NavItem icon={<ChartIcon />} label="Analytics" active />
          <NavItem icon={<MailIcon />} label="Messaging" active />
        </NavSection>
        <NavSection title="SYSTEM" collapsed={collapsed}>
          <NavItem icon={<ShieldIcon />} label="Access Control" />
        </NavSection>
      </nav>
      <div className="admin-sidebar-footer">
        <NavItem icon={<HelpIcon />} label="Help & Support" collapsed={collapsed} />
      </div>
    </aside>
  );
}
