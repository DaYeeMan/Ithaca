import { research, type ResearchEntry } from './research';

const shared = (id: string, implementation: string): ResearchEntry => {
  const entry = research.find(item => item.id === id)!;
  return { ...entry, id: `troy-${id}`, tools: ['Troy'], implementation };
};

export const troyResearch: ResearchEntry[] = [
  shared('black-scholes', 'Troy prices European vanilla options with independently assumed constant volatility, interest rate, and continuous dividend yield. The true market may instead follow Heston or Merton dynamics; choosing Black–Scholes does not imply the assumptions are correct.'),
  shared('crr', 'Troy uses a European terminal-payoff CRR tree with independently assumed volatility. It does not apply early exercise. Time-step limits bound computation; invalid risk-neutral probabilities produce an error.'),
  shared('monte-carlo', 'Troy averages discounted risk-neutral GBM payoffs for Monte Carlo pricing. Seeded common random numbers stabilize successive values and spot-bump delta estimates. Pricing paths are separate from true market paths; finite sampling error remains.'),
  {
    id: 'troy-heston', method: 'Stochastic volatility', title: 'A Closed-Form Solution for Options with Stochastic Volatility with Applications to Bond and Currency Options',
    authors: 'Steven L. Heston', year: '1993', source: 'https://wwwf.imperial.ac.uk/~ajacquie/IC_Num_Methods/IC_Num_Methods_Docs/Literature/Heston.pdf', access: 'University-hosted paper', tools: ['Troy'],
    summary: 'A stochastic variance process allows volatility to change over time and to correlate with underlying price shocks.',
    implementation: 'Troy uses the Heston dynamics as a model foundation. Its Heston pricing implementation uses bounded risk-neutral Monte Carlo, not this paper’s closed-form formula. True-market and pricing variance parameters are independently configurable.',
  },
  {
    id: 'troy-merton', method: 'Jump diffusion', title: 'Option pricing when underlying stock returns are discontinuous',
    authors: 'Robert C. Merton', year: '1976', source: 'https://www.cmat.edu.uy/~mordecki/hk2010/merton76.pdf', access: 'University-hosted paper', tools: ['Troy'],
    summary: 'Combines continuous price fluctuations with sudden jumps, extending the possible behavior of underlying returns.',
    implementation: 'Troy’s true Merton market combines lognormal diffusion with Poisson lognormal jumps and an expected-jump drift compensator. Merton is a market dynamics choice, not an available maker pricing model.',
  },
  {
    id: 'troy-variance-simulation', method: 'Numerical simulation', title: 'Positive stochastic volatility simulation',
    authors: 'William Halley, Simon J. A. Malham & Anke Wiese', year: '2008', source: 'https://www.macs.hw.ac.uk/~simonm/psdesarxiv.pdf', access: 'Author-hosted manuscript', tools: ['Troy'],
    summary: 'Discusses numerical schemes that address the nonnegative variance constraint in stochastic volatility models.',
    implementation: 'Troy uses log-spot steps and projected/truncated Euler variance steps. This reference provides context for positivity and discretization error; Troy does not implement the paper’s proposed splitting scheme.',
  },
];
