import type { MouseEvent } from "react";

const sections = ["home", "resources", "about"] as const;
export type HomeSection = typeof sections[number];

function focusRepeatedAnchor(event: MouseEvent<HTMLAnchorElement>, section: HomeSection) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (window.location.pathname !== "/" || window.location.hash !== `#${section}`) return;
  // Repeated hash clicks do not emit hashchange, but should still return focus.
  document.getElementById(section)?.focus({ preventScroll: true });
}

export function SiteNavigation({ active }: { active?: HomeSection }) {
  const links = <>
    {sections.map((section) => <a
      key={section}
      href={`/#${section}`}
      aria-current={active === section ? "location" : undefined}
      onClick={(event) => focusRepeatedAnchor(event, section)}
    >{section === "home" ? "Home" : section === "resources" ? "Resources" : "About"}</a>)}
  </>;

  return <nav className="site-navigation" aria-label="Main">{links}</nav>;
}
