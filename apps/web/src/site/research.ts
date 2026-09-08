export interface ResearchEntry {
  id: string;
  method: string;
  title: string;
  authors: string;
  year: string;
  source: string;
  access: string;
  summary: string;
  implementation: string;
  tools: readonly string[];
}

// Primary publications and author/institutional sources. These references
// explain foundations; implementation notes describe this repository's choices.
export const research: ResearchEntry[] = [
  {
    id: "black-scholes", method: "Model foundation", title: "The Pricing of Options and Corporate Liabilities",
    authors: "Fischer Black & Myron Scholes", year: "1973", source: "https://doi.org/10.1086/260062", access: "Publisher · access may vary",
    summary: "A foundation for valuing European options through a replicating hedge and a no-arbitrage model.",
    implementation: "Ithaca uses constant volatility, interest rate, and continuous dividend yield under geometric Brownian motion. The European formula is a reference for numerical comparisons, not a market forecast.", tools: ["Ithaca"],
  },
  {
    id: "crr", method: "Binomial trees", title: "Option pricing: A simplified approach",
    authors: "John C. Cox, Stephen A. Ross & Mark Rubinstein", year: "1979", source: "https://www.sciencedirect.com/science/article/pii/0304405X79900151", access: "Publisher · access may vary",
    summary: "A discrete tree makes option valuation and early-exercise decisions accessible through backward induction.",
    implementation: "American pricing compares immediate exercise with continuation at each date. More time steps reduce tree error; interactive surfaces use fewer steps than scalar prices. This tree also underlies the Asian state-grid method.", tools: ["Ithaca"],
  },
  {
    id: "crank-nicolson", method: "Finite differences", title: "A practical method for numerical evaluation of solutions of partial differential equations of the heat-conduction type",
    authors: "John Crank & Phyllis Nicolson", year: "1947", source: "https://doi.org/10.1017/S0305004100023197", access: "Publisher · access may vary",
    summary: "A time-stepping method for diffusion equations that provides the basis for many finite-difference pricing schemes.",
    implementation: "Ithaca applies Crank–Nicolson on a finite spot grid. Boundaries, grid resolution, and local upwind stabilization affect error. American exercise constraints require the additional PSOR procedure below.", tools: ["Ithaca"],
  },
  {
    id: "monte-carlo", method: "Simulation", title: "Options: A Monte Carlo approach",
    authors: "Phelim P. Boyle", year: "1977", source: "https://www.sciencedirect.com/science/article/abs/pii/0304405X77900058", access: "Publisher · access may vary",
    summary: "Estimate an option value by averaging discounted payoffs from simulated risk-neutral asset paths.",
    implementation: "Seeded paths make runs reproducible. Antithetic pairs and shared random numbers support comparison. Confidence intervals measure sampling uncertainty; they do not include all model or numerical errors.", tools: ["Ithaca"],
  },
  {
    id: "psor", method: "American exercise constraint", title: "Crank Nicolson American Option — PSOR",
    authors: "Paul Johnson · University of Manchester", year: "Undated teaching notes", source: "https://personalpages.manchester.ac.uk/staff/paul.johnson-2/resources/math60082/notebooks/math60082-Examples-Sheet-7-Crank-Nicolson-American-Option.html", access: "Open teaching notes",
    summary: "Projected successive over-relaxation solves the finite-difference system while enforcing the exercise payoff as a lower bound.",
    implementation: "The American finite-difference solver uses a linear complementarity problem, PSOR iterations, and bounded work. This teaching reference explains the procedure; it is not the original Crank–Nicolson paper.", tools: ["Ithaca"],
  },
  {
    id: "longstaff-schwartz", method: "American Monte Carlo", title: "Valuing American Options by Simulation: A Simple Least-Squares Approach",
    authors: "Francis A. Longstaff & Eduardo S. Schwartz", year: "2001", source: "https://escholarship.org/uc/item/43n1k4jb", access: "University repository",
    summary: "Least-squares regression estimates continuation values to decide whether an American option should be exercised.",
    implementation: "Ithaca uses a quadratic regression basis and discrete exercise dates. Surface calculations use reduced path budgets. Regression and exercise-date bias are distinct from the reported sampling interval.", tools: ["Ithaca"],
  },
  {
    id: "reiner-rubinstein", method: "Barrier formulas", title: "Breaking Down the Barriers",
    authors: "Eric Reiner & Mark Rubinstein", year: "1991", source: "https://haas.berkeley.edu/faculty/reiner-eric/", access: "Author bibliography · paper links",
    summary: "Analytical pricing relationships for options whose activation depends on touching a barrier.",
    implementation: "Ithaca implements the Reiner–Rubinstein decomposition for continuously monitored single up/down, in/out barriers with no rebate. Knock-in values use vanilla-minus-knock-out parity. The source link is the author's bibliography, not a free full-text claim.", tools: ["Ithaca"],
  },
  {
    id: "brownian-bridge", method: "Continuous barrier monitoring", title: "Advanced Monte Carlo Methods for Barrier and Related Exotic Options",
    authors: "Emmanuel Gobet", year: "2009", source: "https://hal.science/hal-00319947", access: "Author manuscript repository",
    summary: "Brownian-bridge methods account for barrier crossings that sampled path endpoints can miss.",
    implementation: "For safe endpoints, Ithaca multiplies conditional interval survival probabilities using log-distance from the barrier. It uses exact geometric-Brownian endpoints. This is survival weighting, not a shifted-barrier approximation or a sequential Monte Carlo solver.", tools: ["Ithaca"],
  },
  {
    id: "asian-control-variate", method: "Asian Monte Carlo", title: "A pricing method for options based on average asset values",
    authors: "Angelien G. Z. Kemna & A. C. F. Vorst", year: "1990", source: "https://www.sciencedirect.com/science/article/pii/0378426690900395", access: "Publisher · access may vary",
    summary: "Geometric-average option values provide a useful control variate for simulating arithmetic-average payoffs.",
    implementation: "Ithaca uses equally spaced future observations, excluding the initial spot. Its geometric benchmark is the exact discrete lognormal formula. The arithmetic payoff has no closed form here; the monitoring convention is specific to this implementation.", tools: ["Ithaca"],
  },
];
