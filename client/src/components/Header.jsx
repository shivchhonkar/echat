export default function Header() {
  return (
    <header className="billint-nav">
      <div className="billint-brand">
        <a href="/" className="billint-brand-link" aria-label="Shribi care home">
          <img
            src="https://shribi.com/assets/shribi-logo.png"
            alt=""
            className="billint-logo"
            width={44}
            height={44}
            decoding="async"
          />
          <span className="billint-brand-text">
            <span className="billint-brand-billinte">Shribi</span>
            <span className="billint-brand-chat">care</span>
          </span>
        </a>
      </div>

      <nav className="billint-nav-links" aria-label="Main navigation">
        <a href="/">Home</a>
        <a href="/admin">Admin Panel</a>
      </nav>

      <div className="billint-nav-actions">
        <a className="billint-btn-ghost" href="/admin">
          Login
        </a>
        <a className="billint-btn-primary" href="/signup">
          Signup for free
        </a>
      </div>
    </header>
  );
}
