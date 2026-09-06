import { BlockMath, InlineMath } from "react-katex";
import type { OptionSide } from "../types";

export function EquationPanel({ side }: { side: OptionSide }) {
  const payoff = side === "call" ? "\\max(S-K,0)" : "\\max(K-S,0)";
  return (
    <div className="equation-content">
      <h2>Governing equation</h2>
      <section>
        <h3>Black–Scholes PDE</h3>
        <BlockMath math={"\\frac{\\partial V}{\\partial t}+\\frac{1}{2}\\sigma^2S^2\\frac{\\partial^2V}{\\partial S^2}+(r-q)S\\frac{\\partial V}{\\partial S}-rV=0"} />
        <BlockMath math={"0\\leq t<T,\\quad 0<S<\\infty"} />
      </section>
      <section>
        <h3>Terminal condition</h3>
        <BlockMath math={`V(S,T)=${payoff}`} />
      </section>
      <section>
        <h3>Boundary conditions</h3>
        {side === "call" ? (
          <>
            <BlockMath math={"V(0,t)=0"} />
            <BlockMath math={"V(S_{\\max},t)\\approx S_{\\max}e^{-q(T-t)}-Ke^{-r(T-t)}"} />
          </>
        ) : (
          <>
            <BlockMath math={"V(0,t)\\approx Ke^{-r(T-t)}"} />
            <BlockMath math={"V(S_{\\max},t)\\approx0"} />
          </>
        )}
      </section>
      <section>
        <h3>About the selected method</h3>
        <p>
          Closed form evaluates the analytical Black–Scholes solution under constant volatility,
          continuous rates, and lognormal spot dynamics. It provides the Phase 1 reference for later
          numerical methods.
        </p>
        <p className="equation-note">
          Time axis uses <InlineMath math={"\\tau=T-t"} />. At <InlineMath math={"\\tau=0"} />, the surface equals the payoff.
        </p>
      </section>
    </div>
  );
}
