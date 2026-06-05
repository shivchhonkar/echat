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

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" strokeLinecap="round" />
    </svg>
  );
}

function ContactIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 2v4M8 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" strokeLinecap="round" />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" />
    </svg>
  );
}

function PlugIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22v-5M9 8V2M15 8V2M6 12H4a2 2 0 0 0-2 2v2a6 6 0 0 0 6 6h8a6 6 0 0 0 6-6v-2a2 2 0 0 0-2-2h-2" strokeLinecap="round" />
    </svg>
  );
}

function AgentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" />
      <circle cx="12" cy="7" r="4" />
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

function BillingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" strokeLinecap="round" />
    </svg>
  );
}

function LogsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" strokeLinecap="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
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

function NavItem({ icon, label, active, badge, collapsed }) {
  return (
    <button type="button" className={`admin-nav-item ${active ? "active" : ""}`} title={collapsed ? label : undefined}>
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

export default function AdminSidebar({ activeCount = 0, collapsed = false }) {
  return (
    <aside className={`admin-console-sidebar ${collapsed ? "collapsed" : ""}`}>
      <nav className="admin-sidebar-nav">
        <NavItem icon={<HomeIcon />} label="Dashboard" />
        <NavSection title="CONVERSATIONS" collapsed={collapsed}>
          <NavItem icon={<UsersIcon />} label="Active Users" active badge={activeCount || undefined} />
          <NavItem icon={<ChatIcon />} label="All Conversations" />
          <NavItem icon={<EyeIcon />} label="Visitors" />
          <NavItem icon={<HistoryIcon />} label="History" />
          <NavItem icon={<ContactIcon />} label="Contacts" />
        </NavSection>
        <NavSection title="CUSTOMIZATION" collapsed={collapsed}>
          <NavItem icon={<PaletteIcon />} label="Appearance" />
          <NavItem icon={<SettingsIcon />} label="Settings" />
          <NavItem icon={<PlugIcon />} label="Integrations" />
        </NavSection>
        <NavSection title="TEAM" collapsed={collapsed}>
          <NavItem icon={<AgentIcon />} label="Agents" />
          <NavItem icon={<ShieldIcon />} label="Roles & Permissions" />
        </NavSection>
        <NavSection title="SYSTEM" collapsed={collapsed}>
          <NavItem icon={<BillingIcon />} label="Billing" />
          <NavItem icon={<LogsIcon />} label="Logs" />
        </NavSection>
      </nav>
      <div className="admin-sidebar-footer">
        <NavItem icon={<HelpIcon />} label="Help & Support" collapsed={collapsed} />
      </div>
    </aside>
  );
}
