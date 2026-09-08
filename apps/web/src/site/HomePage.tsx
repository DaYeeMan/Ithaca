import { useEffect, useState } from "react";
import { SiteLayout } from "./SiteLayout";
import type { HomeSection } from "./SiteNavigation";
import { ResearchContent, AsianLatticeContent } from "./ResearchContent";
import { research } from "./research";
import { contactEmail, contactHref } from "./siteInfo";

const sections: HomeSection[] = ["home", "resources", "about"];

export default function HomePage() {
  const [active, setActive] = useState<HomeSection>("home");

  useEffect(() => {
    let frame = 0;
    const updateActive = () => {
      const headerBottom = document.querySelector(".site-header")?.getBoundingClientRect().bottom ?? 0;
      let current: HomeSection = "home";
      for (const section of sections) {
        if ((document.getElementById(section)?.getBoundingClientRect().top ?? Infinity) <= headerBottom + 32) current = section;
      }
      if (window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = "about";
      setActive(current);
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateActive);
    };
    const focusHash = () => {
      const target = document.getElementById(window.location.hash.slice(1));
      target?.closest<HTMLDetailsElement>("details.resource-project")?.setAttribute("open", "");
      target?.focus({ preventScroll: true });
      // History may restore a position captured midway through smooth scrolling.
      // Reapply the anchor so Back/Forward finishes at the requested section.
      target?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    };
    // A direct hash URL can arrive before React creates its target.
    const initialFrame = requestAnimationFrame(() => {
      const target = document.getElementById(window.location.hash.slice(1));
      if (target) {
        target.closest<HTMLDetailsElement>("details.resource-project")?.setAttribute("open", "");
        target.focus({ preventScroll: true });
        target.scrollIntoView({ behavior: "instant" });
      }
      updateActive();
    });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("hashchange", focusHash);
    return () => {
      cancelAnimationFrame(initialFrame);
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("hashchange", focusHash);
    };
  }, []);

  return <SiteLayout active={active}>
    <section id="home" className="home-section" tabIndex={-1} aria-labelledby="home-title">
      <h1 id="home-title">Quantitative tools for clearer decisions.</h1>
      <p className="site-intro">Purpose-built models. Transparent assumptions. Visual results.</p>
      <div className="tool-list">
        <article className="tool-entry">
          <span className="section-index" aria-hidden="true">01</span>
          <span className="ghost-number" aria-hidden="true">01</span>
          <h2>Ithaca</h2>
          <img className="surface-preview" src="/ithaca-surface.svg" width="450" height="280" alt="" fetchPriority="high" />
          <p>Explore option prices across spot and time.</p>
          <ul className="tool-tags" aria-label="Ithaca features"><li>PDE</li><li>Monte Carlo</li><li>3D Surface</li></ul>
          <a className="launch-link" href="/tools/ithaca">Launch Ithaca <span aria-hidden="true">⟶</span></a>
        </article>
        {["02", "03"].map((number) => <article className="tool-entry upcoming-tool" key={number} aria-label={`Tool ${number}: coming soon`}>
          <span className="ghost-number" aria-hidden="true">{number}</span><h2>Coming soon</h2>
          <span className="coming-soon-action" aria-hidden="true">Coming soon</span>
        </article>)}
      </div>
    </section>
    <section id="resources" className="home-section reading-section" tabIndex={-1} aria-labelledby="resources-title">
      <div className="section-heading">
        <h2 id="resources-title">Research and methods</h2>
        <p>Explore the ideas behind the tools, their assumptions, and how they are implemented.</p>
      </div>
      <details className="resource-project">
        <summary>Ithaca</summary>
        <div className="research-list">
        {research.map((entry, index) => <article id={entry.id} className="research-entry" key={entry.id} tabIndex={-1} aria-labelledby={`${entry.id}-title`}>
          <div className="research-category"><span className="section-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span>{entry.method}</span></div>
          <div className="research-body">
            <ResearchContent entry={entry} headingId={`${entry.id}-title`} />
          </div>
        </article>)}
        <article id="asian-lattice" className="research-entry" tabIndex={-1} aria-labelledby="asian-lattice-title">
          <div className="research-category"><span className="section-index" aria-hidden="true">10</span><span>Implementation note</span></div>
          <div className="research-body">
            <AsianLatticeContent headingId="asian-lattice-title" />
          </div>
        </article>
        </div>
      </details>
    </section>
    <section id="about" className="home-section reading-section" tabIndex={-1} aria-labelledby="about-title">
      <h2 id="about-title">About CapitalCanvas</h2>
      <p>CapitalCanvas makes quantitative methods easier to explore through interactive tools, visible assumptions, and clear visual results.</p>
      <p className="about-contact"><span className="about-name">Emmanuel Zhang</span><br /><a href={contactHref}>{contactEmail}</a></p>
    </section>
  </SiteLayout>;
}
