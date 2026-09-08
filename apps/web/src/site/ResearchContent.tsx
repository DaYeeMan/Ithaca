import type { ResearchEntry } from "./research";

export function ResearchContent({ entry, headingId }: { entry: ResearchEntry; headingId?: string }) {
  return <>
            <h3 id={headingId}><a href={entry.source} rel="noreferrer">{entry.title}<span aria-hidden="true"> ↗</span></a></h3>
            <p className="citation-meta">{entry.authors} · {entry.year}</p>
            <p>{entry.summary}</p>
            <div className="resource-meta"><span>{entry.access}</span></div>
            <details><summary>Implementation</summary><p>{entry.implementation}</p></details>
  </>;
}

export function AsianLatticeContent({ headingId }: { headingId?: string }) {
  return <>
            <h3 id={headingId}>Asian options: a running-average state</h3>
            <p>Ithaca extends a CRR tree with a grid of running averages. At observation dates, it updates the average and interpolates continuation values between grid points. This is a project implementation choice, not a separate published solver.</p>
            <p>The grid introduces interpolation error. When tree probabilities are invalid, the implementation falls back to a moment-matched approximation. This method is not an Asian Crank–Nicolson PDE solver.</p>
            <a href="https://www.sciencedirect.com/science/article/pii/0304405X79900151" rel="noreferrer">Read the underlying CRR reference <span aria-hidden="true">↑</span></a>
  </>;
}
