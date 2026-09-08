import { useEffect } from "react";
import { SiteLayout } from "./SiteLayout";
import { contactEmail, contactHref } from "./siteInfo";
import notices from "./notices.json";

const pages: Record<string, { title: string; sections: [string, string][] }> = {
  "/privacy": { title: "Privacy", sections: [
    ["About this project", "CapitalCanvas is a personal, noncommercial educational project based in Chicago, Illinois. Use the contact below for privacy questions and requests."],
    ["Calculations", "Ithaca sends your model parameters to its solver service to calculate results. The application has no accounts, database of saved calculations, or persistent browser storage for inputs and results. Calculations are processed in memory. Do not enter personal or confidential information into model fields."],
    ["Technical information", "Application request logs contain request identifiers, paths, response status, and duration, not calculation request bodies. Hosting infrastructure may process IP addresses, browser information, and request metadata for delivery, security, and diagnostics. The application does not add advertising or analytics trackers."],
    ["Providers and email", "Vercel hosts the site. If you email the project, Gmail processes your address and message so the project can respond. Providers may process information in countries other than your own. Their privacy notices describe their separate practices."],
    ["Retention and requests", "The application does not retain a calculation history. Vercel manages infrastructure-log retention under its service settings and policies. Email correspondence remains in the project mailbox until deleted by the operator; you can request deletion using the contact below. Contact the project to ask about your correspondence, request correction or deletion, or raise a concern. Requests depend on applicable obligations and information available to the operator."],
    ["External research", "Research links lead to independent publishers and repositories. Their privacy practices and access conditions apply when you visit them."]
  ] },
  "/terms": { title: "Terms of use", sections: [
    ["Purpose", "CapitalCanvas provides educational quantitative tools and research references as a personal, noncommercial project."],
    ["Acceptable use", "Use the site lawfully. Do not disrupt the service, bypass computation limits, exploit vulnerabilities, or submit automated workloads that interfere with other visitors. Features and capacity may change or become unavailable."],
    ["Responsibility", "Check inputs, assumptions, numerical convergence, and the suitability of results independently. The site provides no brokerage service, trade execution, personalized investment recommendation, or promise of financial performance."],
    ["Materials", "Linked research remains the property of its authors and publishers. Linking does not imply endorsement or permission to reproduce their work. Software components remain subject to their respective licenses."],
    ["Availability", "Tools are provided as available, without a guarantee of accuracy, uninterrupted operation, or fitness for a particular purpose. Nothing here excludes rights or obligations that applicable law does not allow to be excluded."]
  ] },
  "/disclaimer": { title: "Disclaimer", sections: [
    ["Educational use", "Outputs are theoretical estimates, not investment advice, executable market quotes, or recommendations to buy or sell securities."],
    ["Model assumptions", "Constant volatility, rates, dividend yields, idealized trading, and simplified exercise or monitoring rules may differ materially from real markets. You supply inputs; the tools do not provide live market data."],
    ["Numerical uncertainty", "Tree and grid results depend on resolution and boundary choices. Monte Carlo results have sampling error; confidence intervals do not capture every source of model error. American exercise regression, barrier monitoring, and Asian running-average interpolation introduce additional approximations."],
    ["Independent verification", "Validate outputs independently before consequential use. Accuracy, profit, and avoidance of loss are not guaranteed. Review the selected method explanation and research notes. Use the contact below to report suspected errors."]
  ] },
  "/notices": { title: "Attributions", sections: [["Materials", "Research is linked to its original authors and publishers. The homepage surface is generated from the Black–Scholes model within this repository. Notices below reproduce the licenses and attribution notices for frontend software and mathematical fonts used by this site."]] },
};

export default function InformationPage({ path }: { path: string }) {
  const page = pages[path];
  useEffect(() => { document.getElementById("page-title")?.focus({ preventScroll: true }); }, [path]);
  return <SiteLayout><section className="information-page">
    <span className="section-index">{page ? "Updated September 8, 2026" : "404"}</span>
    <h1 id="page-title" tabIndex={-1}>{page?.title ?? "Page not found"}</h1>
    {page ? <>
      {page.sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}
      {path === "/privacy" && <p>Provider notices: <a href="https://vercel.com/legal/privacy-notice">Vercel</a> · <a href="https://policies.google.com/privacy">Google</a>.</p>}
      {path === "/notices" && notices.map(notice => <details className="license-entry" key={notice.name}><summary>{notice.name} {notice.version}</summary><pre>{notice.text}</pre></details>)}
      <p>Contact: <a href={contactHref}>{contactEmail}</a></p>
      <p><a href="/#resources">Research and methods</a> · <a href="/disclaimer">Disclaimer</a> · <a href="/notices">Attributions</a></p>
    </> : <p>This page is not available. Return to CapitalCanvas to explore the tools and research.</p>}
    <a href="/#home">Return home</a>
  </section></SiteLayout>;
}
