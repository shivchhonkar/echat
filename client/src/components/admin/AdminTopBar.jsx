import { useEffect, useRef, useState } from "react";

function LogoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="4" fill="#2563eb" />
      <path d="M8 10h8M8 14h5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AdminTopBar({
  noticeCount = 0,
  onToggleSidebar,
  onSignOut,
  profileInitials = "A",
  profileName = "Admin",
  showOnlinePill = true,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="admin-console-topbar">
      <div className="admin-topbar-left">
        <div className="admin-brand">
          <LogoIcon />
          <span>eChat</span>
        </div>
        <button type="button" className="admin-icon-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <MenuIcon />
        </button>
      </div>
      <div className="admin-topbar-right">
        {showOnlinePill ? (
          <div className="admin-online-pill">
            <span className="admin-online-dot" aria-hidden="true" />
            Online
          </div>
        ) : null}
        <button type="button" className="admin-icon-btn admin-notify-btn" aria-label="Notifications">
          <BellIcon />
          {noticeCount > 0 ? <span className="admin-notify-badge">{noticeCount > 9 ? "9+" : noticeCount}</span> : null}
        </button>
        <div className="user-menu" ref={menuRef}>
          <button
            type="button"
            className="admin-profile-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <span className="admin-profile-avatar" aria-hidden="true">{profileInitials}</span>
            <span className="admin-profile-name">{profileName}</span>
            <ChevronIcon />
          </button>
          {menuOpen ? (
            <div className="user-dropdown" role="menu">
              <button type="button" className="dropdown-link danger" role="menuitem" onClick={() => { setMenuOpen(false); onSignOut?.(); }}>
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
