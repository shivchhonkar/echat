import { useMemo, useState } from "react";
import { buildInstallSnippet, WIDGET_PROD_URL } from "../utils/embedSnippet";
import { toast } from "../utils/toast";

const DEMO_WIDGET_KEY = "your-widget-key";

export default function EmbedHowToSection() {
  const [copied, setCopied] = useState(false);

  const snippet = useMemo(() => buildInstallSnippet(DEMO_WIDGET_KEY, WIDGET_PROD_URL), []);

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      toast.success("Embed code copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy embed code");
    }
  }

  return (
    <section className="billint-embed-howto" aria-labelledby="embed-howto-title">
      <div className="billint-embed-howto-inner">
        <div className="billint-embed-howto-copy">
          <div className="section-head">
            <h2 id="embed-howto-title" className="font-normal">How to use</h2>
            <p>
              Add live support chat to any website in three steps. Sign up first to get your unique widget key,
              then paste this snippet before the closing <code>&lt;/body&gt;</code> tag.
            </p>
          </div>

          <ol className="billint-embed-steps">
            <li>
              <span className="billint-embed-step-num">1</span>
              <div>
                <h3>Create your tenant</h3>
                <p>
                  <a href="/signup">Sign up free</a> and copy your widget key from the success screen.
                </p>
              </div>
            </li>
            <li>
              <span className="billint-embed-step-num">2</span>
              <div>
                <h3>Paste the embed code</h3>
                <p>Replace <code>your-widget-key</code> with your key and add both script tags to your site.</p>
              </div>
            </li>
            <li>
              <span className="billint-embed-step-num">3</span>
              <div>
                <h3>Reply from admin console</h3>
                <p>
                  Open <a href="/admin">Tenant Admin</a> to chat with visitors in real time.
                </p>
              </div>
            </li>
          </ol>

          <div className="billint-embed-code-wrap">
            <div className="billint-embed-code-head">
              <span>Embed snippet</span>
              <button type="button" className="billint-btn-ghost billint-embed-copy-btn" onClick={copySnippet}>
                {copied ? "Copied!" : "Copy code"}
              </button>
            </div>
            <pre className="code-block billint-embed-code">{snippet}</pre>
          </div>
        </div>

        <div className="billint-embed-preview" aria-hidden="false">
          <p className="billint-embed-preview-label">Integration snapshot</p>
          <div className="billint-embed-browser">
            <div className="billint-embed-browser-bar">
              <span className="billint-embed-browser-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="billint-embed-browser-url">https://your-website.com</span>
            </div>
            <div className="billint-embed-browser-body">
              <div className="billint-embed-page-mock">
                <span className="billint-embed-page-line wide" />
                <span className="billint-embed-page-line" />
                <span className="billint-embed-page-line medium" />
                <span className="billint-embed-page-block" />
              </div>
              <div className="billint-embed-widget-mock">
                <div className="billint-embed-widget-header">
                  <span className="billint-embed-widget-avatar">S</span>
                  <div>
                    <strong>Support Chat</strong>
                    <small>We're here to help!</small>
                  </div>
                </div>
                <div className="billint-embed-widget-messages">
                  <div className="billint-embed-msg theirs">Hi, I need help with my order.</div>
                  <div className="billint-embed-msg mine">Sure — happy to help you right away.</div>
                </div>
                <div className="billint-embed-widget-input">Type your message...</div>
              </div>
              <div className="billint-embed-fab-mock" title="Collapsed widget button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
          <p className="billint-embed-preview-note">
            The widget appears fixed at the bottom-right of your site — visitors click to chat, you respond from the admin inbox.
          </p>
        </div>
      </div>
    </section>
  );
}
