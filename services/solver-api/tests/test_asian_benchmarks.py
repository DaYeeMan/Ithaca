import unittest

import numpy as np
from scipy.integrate import quad

from app.solvers.asian import geometric_asian_price
from app.solvers.black_scholes import MarketInputs


BASE = MarketInputs(100.0, 100.0, 1.0, 0.20, 0.05, 0.0)
GEOMETRIC_CALL = 5.94020022163352
GEOMETRIC_PUT = 3.651734175909653
ARITHMETIC_CALL = 6.15601997
ARITHMETIC_PUT = 3.53445370
ARITHMETIC_REFERENCE_STANDARD_ERROR = 0.000022


class AsianBenchmarkTests(unittest.TestCase):
    def test_geometric_monthly_matches_locked_values(self) -> None:
        self.assertAlmostEqual(geometric_asian_price(BASE, "call", 12), GEOMETRIC_CALL, delta=1e-12)
        self.assertAlmostEqual(geometric_asian_price(BASE, "put", 12), GEOMETRIC_PUT, delta=1e-12)

    def test_geometric_formula_matches_independent_density_quadrature(self) -> None:
        observations = 12
        times = np.arange(1, observations + 1) / observations
        mean = np.log(BASE.spot) + (BASE.rate - 0.5 * BASE.volatility**2) * np.mean(times)
        variance = BASE.volatility**2 * np.minimum.outer(times, times).mean()
        deviation = np.sqrt(variance)

        def density(value: float) -> float:
            return np.exp(-0.5 * ((value - mean) / deviation) ** 2) / (deviation * np.sqrt(2.0 * np.pi))

        call = np.exp(-BASE.rate) * quad(lambda value: (np.exp(value) - BASE.strike) * density(value), np.log(BASE.strike), mean + 12 * deviation)[0]
        put = np.exp(-BASE.rate) * quad(lambda value: (BASE.strike - np.exp(value)) * density(value), mean - 12 * deviation, np.log(BASE.strike))[0]
        self.assertAlmostEqual(call, GEOMETRIC_CALL, delta=1e-11)
        self.assertAlmostEqual(put, GEOMETRIC_PUT, delta=1e-11)

    def test_geometric_put_call_parity(self) -> None:
        times = np.arange(1, 13) / 12
        mean = np.log(BASE.spot) + (BASE.rate - 0.5 * BASE.volatility**2) * np.mean(times)
        variance = BASE.volatility**2 * np.minimum.outer(times, times).mean()
        expected_geometric_average = np.exp(mean + 0.5 * variance)
        residual = GEOMETRIC_CALL - GEOMETRIC_PUT - np.exp(-BASE.rate) * (expected_geometric_average - BASE.strike)
        self.assertAlmostEqual(residual, 0.0, delta=1e-12)


if __name__ == "__main__":
    unittest.main()
