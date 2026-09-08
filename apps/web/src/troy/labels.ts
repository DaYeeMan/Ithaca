import type { Dynamics, Pricing } from './types';
export const dynamicsLabels: Record<Dynamics, string> = { gbm: 'Geometric Brownian Motion', heston: 'Heston', merton: 'Merton Jump Diffusion' };
export const pricingLabels: Record<Pricing, string> = { bs: 'Black–Scholes', crr: 'Cox–Ross–Rubinstein', mc: 'Monte Carlo', heston: 'Heston' };
