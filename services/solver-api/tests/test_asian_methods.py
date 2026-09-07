import unittest

import numpy as np

from app.solvers.asian import (
    _asian_payoffs,
    _antithetic_normals,
    augmented_asian_price,
    geometric_asian_price,
    solve_asian_augmented,
    solve_asian_monte_carlo,
)
from app.solvers.black_scholes import MarketInputs
BASE = MarketInputs(100.0, 100.0, 1.0, 0.20, 0.05, 0.0)
ARITHMETIC_CALL = 6.15601997
ARITHMETIC_PUT = 3.53445370
ARITHMETIC_REFERENCE_STANDARD_ERROR = 0.000022


class AsianMethodTests(unittest.TestCase):
    def test_twelve_observations_exclude_initial_spot(self) -> None:
        normals = np.zeros((2, 12))
        _, _, spots = _asian_payoffs(BASE, "call", 12, "arithmetic", normals)
        self.assertEqual(spots.shape[1], 12)
        expected_first = BASE.spot * np.exp((BASE.rate - 0.5 * BASE.volatility**2) / 12)
        self.assertAlmostEqual(spots[0, 0], expected_first)

    def test_geometric_monte_carlo_covers_analytical_reference(self) -> None:
        for side in ("call", "put"):
            result = solve_asian_monte_carlo(BASE, side, 12, "geometric", 100, 0, 300, 20, 20, 20_000, 1_729, True, 0.95)
            expected = geometric_asian_price(BASE, side, 12)
            self.assertLessEqual(result["confidence_interval"]["lower"], expected)
            self.assertGreaterEqual(result["confidence_interval"]["upper"], expected)

    def test_arithmetic_control_variate_agrees_with_locked_reference(self) -> None:
        for side, expected in (("call", ARITHMETIC_CALL), ("put", ARITHMETIC_PUT)):
            result = solve_asian_monte_carlo(BASE, side, 12, "arithmetic", 100, 0, 300, 20, 20, 20_000, 1_729, True, 0.95)
            combined = 1.96 * np.sqrt(result["standard_error"] ** 2 + ARITHMETIC_REFERENCE_STANDARD_ERROR**2)
            self.assertLessEqual(abs(result["price"] - expected), combined)

    def test_augmented_state_agrees_with_monthly_references(self) -> None:
        for average_type, side, expected in (
            ("geometric", "call", geometric_asian_price(BASE, "call", 12)),
            ("geometric", "put", geometric_asian_price(BASE, "put", 12)),
            ("arithmetic", "call", ARITHMETIC_CALL),
            ("arithmetic", "put", ARITHMETIC_PUT),
        ):
            price = augmented_asian_price(BASE, side, 12, average_type, steps_per_observation=12, average_steps=321)
            self.assertLessEqual(abs(price - expected), 0.03)

    def test_seed_reproducibility_and_observation_count_effect(self) -> None:
        first = solve_asian_monte_carlo(BASE, "call", 12, "arithmetic", 100, 0, 300, 20, 20, 4_000, 77, True, 0.95)
        second = solve_asian_monte_carlo(BASE, "call", 12, "arithmetic", 100, 0, 300, 20, 20, 4_000, 77, True, 0.95)
        fewer = solve_asian_monte_carlo(BASE, "call", 6, "arithmetic", 100, 0, 300, 20, 20, 4_000, 77, True, 0.95)
        self.assertEqual(first["price"], second["price"])
        self.assertNotEqual(first["price"], fewer["price"])

    def test_fixed_state_surface_contains_scalar_at_initial_slice(self) -> None:
        result = solve_asian_augmented(BASE, "call", 12, "arithmetic", 110, 0, 200, 21, 20, 240)
        spot_index = result["surface"]["spots"].index(100.0)
        self.assertAlmostEqual(result["surface"]["prices"][-1][spot_index], result["price"], delta=1e-12)
        self.assertEqual(result["diagnostics"]["average_state"], 110)


if __name__ == "__main__":
    unittest.main()
