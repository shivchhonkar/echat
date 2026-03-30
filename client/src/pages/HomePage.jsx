import Header from "../components/Header";
import Footer from "../components/Footer";

export default function HomePage() {
  return (
    <div className="billint-home">
      <Header />

      <main>
        <section className="billint-hero">
          <div>
            <h1>Free Customer Support Chat Platform for Small Businesses</h1>
            <p>
              Create your tenant workspace, launch chat instantly, and manage customer conversations with one clean dashboard.
            </p>
            <div className="billint-hero-cta">
              <a className="billint-btn-primary" href="/signup">Start Free Setup</a>
              <a className="billint-btn-ghost" href="/admin">Book a Demo</a>
            </div>
            <div className="billint-tags">
              <span>Multi-tenant</span>
              <span>Real-time support</span>
              <span>Secure access</span>
            </div>
          </div>
          <div className="billint-hero-visual">
            <img
              src="/customer_support_professional.png"
              alt="Customer support professional"
              className="billint-hero-banner"
            />
          </div>
        </section>

        {/* <section className="billint-trust">
          <article><strong>10x</strong><span>Faster onboarding</span></article>
          <article><strong>100%</strong><span>Tenant isolation</span></article>
          <article><strong>Secure</strong><span>Role based access</span></article>
        </section> */}

        <section className="billint-features">
          <div className="section-head">
            <h2 className="font-normal">Everything you need to run support smoothly</h2>
            <p>Modern tools for customer chat, team productivity, and business visibility.</p>
          </div>
          <div className="feature-grid">
            <article><h3>Live Chat Widget</h3><p>Floating web widget with typing indicators, reconnect, and history.</p></article>
            <article><h3>Admin Inbox</h3><p>Tenant-specific conversations, unread counters, and quick replies.</p></article>
            <article><h3>Business Analytics</h3><p>Track sessions, message volume, and communicated user counts.</p></article>
            <article><h3>Platform Controls</h3><p>Super-admin tools for tenant plans, blocking, and account lifecycle.</p></article>
            <article><h3>Quick Embed</h3><p>Copy and paste a simple script to enable chat in your application.</p></article>
            <article><h3>Secure Access</h3><p>OTP super-admin login, tenant-level auth, and protected APIs.</p></article>
          </div>
        </section>

        {/* <section className="billint-cta-band">
          <h2>Ready to simplify customer support for your business?</h2>
          <p>Start your free tenant setup and launch support chat in minutes.</p>
          <div className="billint-hero-cta">
            <a className="billint-btn-primary" href="/signup">Get Started Free</a>
            <a className="billint-btn-ghost light" href="/super-admin">Talk to Sales</a>
          </div>
        </section> */}

        {/* <section className="billint-faq">
          <div className="section-head">
            <h2>Frequently asked questions</h2>
            <p>Quick answers before you launch.</p>
          </div>
          <div className="faq-list">
            <article><h3>Is this multi-tenant?</h3><p>Yes. Each business gets isolated data, admin access, and widget key.</p></article>
            <article><h3>Can I manage multiple tenants?</h3><p>Yes. Super-admin can monitor and control all tenant workspaces.</p></article>
            <article><h3>Is widget setup fast?</h3><p>Yes. Use the generated snippet after signup and go live quickly.</p></article>
          </div>
        </section> */}
      </main>

      <Footer />
    </div>
  );
}
