import { BlockMath, InlineMath } from "react-katex";
import type { OptionFamily, OptionSide, SolverMethod } from "../types";

const methodDescription: Record<SolverMethod, string> = {
  closed_form: "Closed form evaluates the analytical Black–Scholes solution and provides the reference for numerical error.",
  binomial: "Cox–Ross–Rubinstein backward induction compares continuation and immediate exercise at every tree date.",
  finite_difference: "Crank–Nicolson advances the PDE on a finite spot domain. Grid spacing and the numerical boundary determine discretization and truncation error.",
  monte_carlo: "Monte Carlo samples risk-neutral geometric Brownian paths. Reported confidence intervals describe statistical uncertainty, not deterministic precision.",
};

export function EquationPanel({ family, side, method, barrierDirection, barrierStyle, barrierLevel, asianAverageType, asianObservations, asianAverageState }: {
  family: OptionFamily;
  side: OptionSide;
  method: SolverMethod;
  barrierDirection: "down" | "up";
  barrierStyle: "in" | "out";
  barrierLevel: number;
  asianAverageType: "arithmetic" | "geometric";
  asianObservations: number;
  asianAverageState: number;
}) {
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
        {family === "asian" ? (
          <>
            <BlockMath math={`V(S,A,T)=${side === "call" ? "\\max(A-K,0)" : "\\max(K-A,0)"}`} />
            <BlockMath math={asianAverageType === "arithmetic" ? "A_n=\\frac{1}{n}\\sum_{i=1}^{n}S_{t_i}" : "A_n=\\left(\\prod_{i=1}^{n}S_{t_i}\\right)^{1/n}"} />
          </>
        ) : <BlockMath math={`V(S,T)=${payoff}`} />}
        {family === "american" ? <BlockMath math={`V(S,t)\\geq ${payoff}`} /> : null}
      </section>
      <section>
        <h3>Boundary conditions</h3>
        {family === "asian" ? (
          <>
            <BlockMath math={asianAverageType === "arithmetic" ? "A^+_m=\\frac{mA_m+S_{t_{m+1}}}{m+1}" : "A^+_m=\\left(A_m^mS_{t_{m+1}}\\right)^{1/(m+1)}"} />
            <p className="equation-note">{asianObservations} equally spaced future observations; S₀ excluded. Surface fixes running A = {asianAverageState}.</p>
          </>
        ) : family === "barrier" ? (
          <>
            <BlockMath math={barrierStyle === "out" ? "V(H,t)=0" : "V_{in}=V_{vanilla}-V_{out}"} />
            <p className="equation-note">{barrierDirection === "down" ? "Down" : "Up"}-and-{barrierStyle} at H = {barrierLevel}. Continuous monitoring; no rebate.</p>
          </>
        ) : family === "american" && side === "put" ? (
          <>
            <BlockMath math={"V(0,t)=K"} />
            <BlockMath math={"V(S_{\\max},t)\\approx0"} />
          </>
        ) : side === "call" ? (
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
        <p>{family === "asian" && method === "closed_form"
          ? "The discrete geometric average is lognormal, giving an exact analytical benchmark."
          : family === "asian" && method === "finite_difference"
            ? "Backward induction augments spot with a discretized running-average state at each observation date."
            : family === "asian" && method === "monte_carlo"
              ? "Monte Carlo samples exact GBM observation points. Arithmetic pricing uses the geometric payoff as a control variate."
              : family === "barrier" && method === "closed_form" ? "Reiner–Rubinstein evaluates the continuously monitored, zero-rebate single-barrier contract analytically." : methodDescription[method]}</p>
        <p className="equation-note">
          Time axis uses <InlineMath math={"\\tau=T-t"} />. At <InlineMath math={"\\tau=0"} />, the surface equals the payoff.
        </p>
      </section>
    </div>
  );
}
