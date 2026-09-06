import math
import unittest

import numpy as np

from app.solvers.black_scholes import MarketInputs, black_scholes_price, solve_surface
from app.solvers.finite_difference import solve_finite_difference
from app.solvers.monte_carlo import solve_monte_carlo


BASE = MarketInputs(100.0, 100.0, 1.0, 0.2, 0.05, 0.0)


class FiniteDifferenceTests(unittest.TestCase):
    def solve(self, spot_steps: int = 241, time_steps: int = 240) -> dict[str, object]:
        return solve_finite_difference(BASE, "call", 0, 300, 61, 51, spot_steps, time_steps, 300)

    def test_default_grid_matches_locked_price(self) -> None:
        result = self.solve()
        self.assertLessEqual(abs(float(result["price"]) - black_scholes_price(BASE, "call")), 0.02)

    def test_surface_rmse_matches_closed_form(self) -> None:
        reference = solve_surface(BASE, "call", 0, 300, 61, 51)
        finite_difference = self.solve()
        expected = np.asarray(reference["surface"]["prices"])
        actual = np.asarray(finite_difference["surface"]["prices"])
        rmse = math.sqrt(float(np.mean((expected[1:, 1:-1] - actual[1:, 1:-1]) ** 2)))
        self.assertLessEqual(rmse, 0.05)

    def test_refinement_reduces_scalar_error(self) -> None:
        expected = black_scholes_price(BASE, "call")
        coarse = abs(float(self.solve(81, 80)["price"]) - expected)
        fine = abs(float(self.solve(241, 240)["price"]) - expected)
        self.assertLess(fine, coarse)

    def test_terminal_and_spatial_boundaries(self) -> None:
        result = self.solve()
        surface = np.asarray(result["surface"]["prices"])
        spots = np.asarray(result["surface"]["spots"])
        self.assertTrue(np.array_equal(surface[0], np.maximum(spots - BASE.strike, 0.0)))
        self.assertTrue(np.allclose(surface[:, 0], 0.0, atol=1e-12))

    def test_invariant_grid_respects_bounds_monotonicity_and_parity(self) -> None:
        selected_spots = np.asarray([50.0, 80.0, 100.0, 120.0, 150.0])
        surface_spots = np.linspace(50.0, 150.0, 21)
        selected_indices = [int(np.where(surface_spots == spot)[0][0]) for spot in selected_spots]
        for maturity in (1 / 365, 0.25, 1.0, 5.0):
            for volatility in (0.01, 0.20, 0.80):
                for rate in (-0.01, 0.00, 0.05, 0.15):
                    for dividend in (0.00, 0.02, 0.10):
                        inputs = MarketInputs(100.0, 100.0, maturity, volatility, rate, dividend)
                        call = solve_finite_difference(inputs, "call", 50, 150, 21, 20, 241, 240, 400)
                        put = solve_finite_difference(inputs, "put", 50, 150, 21, 20, 241, 240, 400)
                        calls = np.asarray(call["surface"]["prices"])[-1, selected_indices]
                        puts = np.asarray(put["surface"]["prices"])[-1, selected_indices]
                        discounted_spots = selected_spots * math.exp(-dividend * maturity)
                        discounted_strike = 100.0 * math.exp(-rate * maturity)
                        with self.subTest(maturity=maturity, volatility=volatility, rate=rate, dividend=dividend):
                            self.assertTrue(np.all(calls >= -0.05))
                            self.assertTrue(np.all(puts >= -0.05))
                            self.assertTrue(np.all(np.diff(calls) >= -0.05))
                            self.assertTrue(np.all(np.diff(puts) <= 0.05))
                            self.assertTrue(np.all(calls <= discounted_spots + 0.05))
                            self.assertTrue(np.all(puts <= discounted_strike + 0.05))
                            parity = discounted_spots - discounted_strike
                            self.assertTrue(np.allclose(calls - puts, parity, atol=0.05))


class MonteCarloTests(unittest.TestCase):
    def solve(self, paths: int = 20_000) -> dict[str, object]:
        return solve_monte_carlo(BASE, "call", 0, 300, 20, 20, paths, 64, 1_729, True, 0.95)

    def test_seeded_run_is_reproducible(self) -> None:
        first = self.solve(4_000)
        second = self.solve(4_000)
        self.assertEqual(first["price"], second["price"])
        self.assertEqual(first["standard_error"], second["standard_error"])
        self.assertEqual(first["surface"]["prices"], second["surface"]["prices"])

    def test_default_confidence_interval_covers_reference(self) -> None:
        result = self.solve()
        interval = result["confidence_interval"]
        expected = black_scholes_price(BASE, "call")
        self.assertLessEqual(interval["lower"], expected)
        self.assertGreaterEqual(interval["upper"], expected)

    def test_standard_error_scales_with_inverse_square_root(self) -> None:
        small = float(self.solve(10_000)["standard_error"])
        large = float(self.solve(40_000)["standard_error"])
        ratio = small / large
        self.assertGreater(ratio, 1.7)
        self.assertLess(ratio, 2.3)

    def test_convergence_uses_nested_path_counts(self) -> None:
        result = self.solve(20_000)
        counts = [point["paths"] for point in result["convergence"]]
        self.assertEqual(counts, sorted(set(counts)))
        self.assertEqual(counts[-1], 20_000)

    def test_antithetic_setting_changes_samples_without_bias(self) -> None:
        antithetic = self.solve(10_000)
        ordinary = solve_monte_carlo(BASE, "call", 0, 300, 2, 2, 10_000, 64, 1_729, False, 0.95)
        expected = black_scholes_price(BASE, "call")
        self.assertNotEqual(antithetic["price"], ordinary["price"])
        self.assertLess(abs(float(antithetic["price"]) - expected), 4 * float(antithetic["standard_error"]))
        self.assertLess(abs(float(ordinary["price"]) - expected), 4 * float(ordinary["standard_error"]))

    def test_repeated_confidence_interval_coverage(self) -> None:
        expected = black_scholes_price(BASE, "call")
        covered = 0
        for seed in range(20):
            result = solve_monte_carlo(BASE, "call", 0, 300, 2, 2, 4_000, 32, seed, True, 0.95)
            interval = result["confidence_interval"]
            covered += interval["lower"] <= expected <= interval["upper"]
        self.assertGreaterEqual(covered, 16)


if __name__ == "__main__":
    unittest.main()
