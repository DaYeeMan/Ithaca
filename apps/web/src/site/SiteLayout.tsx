import type { ReactNode } from "react";
import { SiteNavigation, type HomeSection } from "./SiteNavigation";
import { contactEmail, contactHref } from "./siteInfo";

export function SiteLayout({ children, active }: { children: ReactNode; active?: HomeSection }) {
  return <div className="site-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="site-header">
      <a className="site-wordmark" href="/#home">Capital Canvas</a>
      <SiteNavigation active={active} />
    </header>
    <main id="main-content" tabIndex={-1} className="site-content">{children}</main>
    <footer className="site-footer">
      <div className="footer-brand"><a className="site-wordmark" href="/#home">Capital Canvas</a><p>For education and research.<br />Model outputs are estimates, not investment advice.</p></div>
      <div className="footer-links"><nav aria-label="Legal"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/disclaimer">Disclaimer</a><a href="/notices">Attributions</a></nav><a href={contactHref}>{contactEmail}</a></div>
      <p className="copyright">© {new Date().getFullYear()} CapitalCanvas. Third-party works remain with their respective owners.</p>
    </footer>
  </div>;
}
