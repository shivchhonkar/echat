function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-13h4v2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2" y="9" width="4" height="12" rx="1" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="m4 4 16 16M20 4 4 20" strokeLinecap="round" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="m10 9 6 3-6 3V9Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path
        d="M21 11.5a8.5 8.5 0 0 1-9.9 8.3L3 21l1.2-7.1A8.5 8.5 0 1 1 21 11.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SocialLink({ href, label, children }) {
  return (
    <a
      href={href}
      className="billint-footer-social-link"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
    >
      {children}
    </a>
  );
}

const SOCIAL_LINKS = [
  { href: "https://www.linkedin.com/company/shribi", label: "LinkedIn", Icon: LinkedInIcon },
  { href: "https://www.facebook.com/shribi", label: "Facebook", Icon: FacebookIcon },
  { href: "https://www.instagram.com/shribi", label: "Instagram", Icon: InstagramIcon },
  { href: "https://x.com/shribi", label: "X (Twitter)", Icon: XIcon },
  { href: "https://www.youtube.com/@shribi", label: "YouTube", Icon: YouTubeIcon },
  { href: "https://care.shribi.com/", label: "Live chat", Icon: ChatIcon },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="billint-footer">
      <div className="billint-footer-inner">
        <div className="billint-footer-brand">
          <span className="billint-footer-title">Shribi care</span>
          <p className="billint-footer-tagline">
            Real-time customer support for modern businesses — chat, voice, and campaigns in one place.
          </p>
          <div className="billint-footer-social" aria-label="Social media">
            {SOCIAL_LINKS.map(({ href, label, Icon }) => (
              <SocialLink key={label} href={href} label={label}>
                <Icon />
              </SocialLink>
            ))}
          </div>
        </div>

        <div className="billint-footer-col">
          <h4 className="billint-footer-heading">Product</h4>
          <nav className="billint-footer-links" aria-label="Product links">
            <a href="/signup">Pricing</a>
            <a href="/widget">Live chat widget</a>
            <a href="/admin">Tenant admin</a>
            <a href="/super-admin">Platform admin</a>
          </nav>
        </div>

        <div className="billint-footer-col">
          <h4 className="billint-footer-heading">Contact</h4>
          <div className="billint-footer-contact">
            <a href="mailto:shivramchhonkar@gmail.com">shivramchhonkar@gmail.com</a>
            <a href="tel:+919650593896">+91 96505 93896</a>
            <a href="https://care.shribi.com/" target="_blank" rel="noopener noreferrer">
              care.shribi.com
            </a>
          </div>
        </div>
      </div>

      <div className="billint-footer-bottom">
        <p className="billint-footer-copy">
          © {year} Shribi care. All rights reserved.{" "}
          <a
            href="https://www.shribi.com/?utm_source=shribi-care-footer"
            className="billint-footer-powered"
            target="_blank"
            rel="noopener noreferrer"
          >
            Powered by Shribi
          </a>
        </p>
        <nav className="billint-footer-legal" aria-label="Legal">
          <a href="/">Privacy</a>
          <a href="/">Terms</a>
        </nav>
      </div>
    </footer>
  );
}
