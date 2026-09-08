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
  const reference = method === "binomial" ? "crr"
    : family === "asian" ? method === "finite_difference" ? "asian-lattice" : "asian-control-variate"
    : method === "finite_difference" ? family === "american" ? "psor" : "crank-nicolson"
    : method === "monte_carlo" ? family === "american" ? "longstaff-schwartz" : family === "barrier" ? "brownian-bridge" : "monte-carlo"
    : family === "barrier" ? "reiner-rubinstein" : "black-scholes";
  const payoff = side === "call" ? "\\max(S-K,0)" : "\\max(K-S,0)";
  const methodName = method === "binomial"
    ? "Cox–Ross–Rubinstein"
    : method === "finite_difference" && family === "asian"
      ? "Augmented-state CRR lattice"
      : method === "finite_difference"
        ? "Crank–Nicolson"
        : method === "monte_carlo" && family === "american"
          ? "Longstaff–Schwartz Monte Carlo"
          : method === "monte_carlo"
            ? "Risk-neutral Monte Carlo"
            : family === "barrier"
              ? "Reiner–Rubinstein closed form"
              : family === "asian"
                ? "Geometric-average closed form"
                : "Black–Scholes closed form";

  const methodEquation = method === "binomial" ? (
    <>
      <BlockMath math={"\\Delta t=T/N"} />
      <BlockMath math={"u=e^{\\sigma\\sqrt{\\Delta t}},\\quad d=u^{-1}"} />
      <BlockMath math={"p=\\frac{e^{(r-q)\\Delta t}-d}{u-d}"} />
      <BlockMath math={"C_j^n=e^{-r\\Delta t}[pV^u+(1-p)V^d]"} />
      {family === "american" ? <BlockMath math={`V_j^n=\\max\\left(${payoff},C_j^n\\right)`} /> : null}
    </>
  ) : method === "finite_difference" && family === "asian" ? (
    <>
      <BlockMath math={asianAverageType === "arithmetic" ? "A^+_m=\\frac{mA_m+S_{t_{m+1}}}{m+1}" : "A^+_m=\\left(A_m^mS_{t_{m+1}}\\right)^{1/(m+1)}"} />
      <BlockMath math={"V_j^n(A)=e^{-r\\Delta t}[pV_{j+1}^{n+1}(A_u^+)+(1-p)V_j^{n+1}(A_d^+)]"} />
    </>
  ) : method === "finite_difference" ? (
    <>
      <BlockMath math={family === "american"
        ? `\\min\\left(-\\mathcal{L}_{BS}V,V-${payoff}\\right)=0`
        : "\\frac{\\partial V}{\\partial t}+\\frac{1}{2}\\sigma^2S^2\\frac{\\partial^2V}{\\partial S^2}+(r-q)S\\frac{\\partial V}{\\partial S}-rV=0"} />
      <BlockMath math={family === "american" ? "\\text{Crank--Nicolson LCP solved by PSOR}" : "\\text{Crank--Nicolson time stepping}"} />
    </>
  ) : method === "monte_carlo" ? (
    <>
      <BlockMath math={"S_{t+\\Delta t}=S_t\\exp\\left[(r-q-\\tfrac12\\sigma^2)\\Delta t+\\sigma\\sqrt{\\Delta t}Z\\right]"} />
      <BlockMath math={family === "american"
        ? `V_n=\\max\\left(${payoff},\\widehat{\\mathbb{E}}^{\\mathbb{Q}}[e^{-r\\Delta t}V_{n+1}\\mid S_n]\\right)`
        : family === "asian"
          ? "V_0=e^{-rT}\\mathbb{E}^{\\mathbb{Q}}[h(A_T)]"
          : "V_0=e^{-rT}\\mathbb{E}^{\\mathbb{Q}}[h(S_T)]"} />
    </>
  ) : family === "asian" ? (
    <BlockMath math={"V_0=e^{-rT}\\mathbb{E}^{\\mathbb{Q}}[h(G_T)],\\quad \\log G_T\\sim\\mathcal{N}(\\mu_G,\\sigma_G^2)"} />
  ) : family === "barrier" ? (
    <BlockMath math={barrierStyle === "in" ? "V_{in}=V_{vanilla}-V_{out}" : "V_{out}=V_{vanilla}-V_{image}"} />
  ) : (
    <>
      <BlockMath math={side === "call" ? "V=Se^{-qT}N(d_1)-Ke^{-rT}N(d_2)" : "V=Ke^{-rT}N(-d_2)-Se^{-qT}N(-d_1)"} />
      <BlockMath math={"d_1=\\frac{\\ln(S/K)+(r-q+\\tfrac12\\sigma^2)T}{\\sigma\\sqrt{T}}"} />
      <BlockMath math={"d_2=d_1-\\sigma\\sqrt{T}"} />
    </>
  );

  return (
    <div className="equation-content">
      <h2>{methodName}</h2>
      <p><a href={`/#${reference}`}>Method reference</a> · <a href="/disclaimer">Disclaimer</a></p>
      <section>
        <h3>Method equation</h3>
        {methodEquation}
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
            <BlockMath math={"\\begin{aligned}V(S_{\\max},t)&\\approx S_{\\max}e^{-q(T-t)}\\\\&\\quad-Ke^{-r(T-t)}\\end{aligned}"} />
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
