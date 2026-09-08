import { useMemo } from "react";
import katex from "katex";

// Formula strings are authored by this application. KaTeX trust remains disabled.
function MathMarkup({ math, displayMode }: { math: string; displayMode: boolean }) {
  const html = useMemo(() => katex.renderToString(math, {
    displayMode, throwOnError: false, trust: false,
  }), [math, displayMode]);
  return displayMode
    ? <div dangerouslySetInnerHTML={{ __html: html }} />
    : <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function BlockMath({ math }: { math: string }) {
  return <MathMarkup math={math} displayMode />;
}

export function InlineMath({ math }: { math: string }) {
  return <MathMarkup math={math} displayMode={false} />;
}
