import unittest
from math import exp, sqrt

import numpy as np

from app.solvers.barrier import (
    _antithetic_normals,
    _barrier_discounted_payoffs,
    _mean_and_error,
    barrier_price,
    solve_barrier_finite_difference,
    solve_barrier_monte_carlo,
)
from app.solvers.black_scholes import MarketInputs, black_scholes_price


BASE = MarketInputs(100.0, 100.0, 1.0, 0.20, 0.05, 0.0)


class BarrierMethodTests(unittest.TestCase):
    def test_finite_difference_matches_both_locked_call_benchmarks(self) -> None:
        for direction, barrier in (("down", 90.0), ("up", 120.0)):
            expected = barrier_price(BASE, "call", direction, "out", barrier)
            result = solve_barrier_finite_difference(
                BASE, "call", direction, "out", barrier, 0, 300, 31, 21, 241, 240, 300,
            )
            self.assertLessEqual(abs(float(result["price"]) - expected), 0.01)

    def test_absorbing_barrier_boundary_is_zero(self) -> None:
        result = solve_barrier_finite_difference(
            BASE, "call", "down", "out", 90.0, 0, 180, 19, 21, 241, 240, 300,
        )
        barrier_index = result["surface"]["spots"].index(90.0)
        self.assertTrue(all(row[barrier_index] == 0.0 for row in result["surface"]["prices"]))

    def test_finite_difference_knock_in_out_parity(self) -> None:
        knock_out = solve_barrier_finite_difference(
            BASE, "call", "down", "out", 90.0, 0, 300, 20, 20, 241, 240, 300,
        )
        knock_in = solve_barrier_finite_difference(
            BASE, "call", "down", "in", 90.0, 0, 300, 20, 20, 241, 240, 300,
        )
        self.assertLessEqual(
            abs(float(knock_in["price"]) + float(knock_out["price"]) - black_scholes_price(BASE, "call")),
            0.01,
        )

    def test_knock_out_value_increases_as_barrier_moves_away(self) -> None:
        self.assertGreater(
            barrier_price(BASE, "call", "down", "out", 80.0),
            barrier_price(BASE, "call", "down", "out", 90.0),
        )
        self.assertGreater(
            barrier_price(BASE, "call", "up", "out", 130.0),
            barrier_price(BASE, "call", "up", "out", 120.0),
        )

    def test_brownian_bridge_reduces_discrete_monitoring_bias(self) -> None:
        paths, steps, seed = 40_000, 12, 1_729
        normals = _antithetic_normals(paths, steps, seed, True)
        bridge_samples, _ = _barrier_discounted_payoffs(
            BASE, "call", "down", "out", 90.0, np.asarray([BASE.spot]), normals,
        )
        bridge_price = float(_mean_and_error(bridge_samples[:, 0], True)[0])

        delta_t = BASE.maturity / steps
        log_steps = (
            (BASE.rate - BASE.dividend - 0.5 * BASE.volatility**2) * delta_t
            + BASE.volatility * sqrt(delta_t) * normals
        )
        path_spots = BASE.spot * np.exp(np.cumsum(log_steps, axis=1))
        survived = np.all(path_spots > 90.0, axis=1)
        naive_samples = exp(-BASE.rate * BASE.maturity) * np.maximum(path_spots[:, -1] - BASE.strike, 0.0) * survived
        naive_price = float(_mean_and_error(naive_samples, True)[0])
        expected = barrier_price(BASE, "call", "down", "out", 90.0)
        self.assertLess(abs(bridge_price - expected), abs(naive_price - expected))

    def test_bridge_monte_carlo_covers_analytical_reference(self) -> None:
        for direction, barrier in (("down", 90.0), ("up", 120.0)):
            result = solve_barrier_monte_carlo(
                BASE, "call", direction, "out", barrier, 0, 300, 20, 20, 20_000, 64, 1_729, True, 0.95,
            )
            expected = barrier_price(BASE, "call", direction, "out", barrier)
            self.assertLessEqual(result["confidence_interval"]["lower"], expected)
            self.assertGreaterEqual(result["confidence_interval"]["upper"], expected)


if __name__ == "__main__":
    unittest.main()
