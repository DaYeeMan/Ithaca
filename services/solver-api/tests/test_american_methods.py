import unittest

from app.solvers.american import (
    solve_american_binomial,
    solve_american_finite_difference,
    solve_american_monte_carlo,
)
from app.solvers.black_scholes import MarketInputs, black_scholes_price


AM_PUT = MarketInputs(40.0, 40.0, 1.0, 0.20, 0.06, 0.0)
AM_PUT_REFERENCE = 2.3196


class AmericanMethodTests(unittest.TestCase):
    def test_production_binomial_matches_locked_reference(self) -> None:
        result = solve_american_binomial(AM_PUT, "put", 0, 120, 20, 20, 800)
        self.assertLessEqual(abs(float(result["price"]) - AM_PUT_REFERENCE), 0.01)

    def test_psor_matches_reference_and_dominates_european_put(self) -> None:
        result = solve_american_finite_difference(AM_PUT, "put", 0, 120, 20, 20, 241, 240, 120)
        price = float(result["price"])
        self.assertLessEqual(abs(price - AM_PUT_REFERENCE), 0.01)
        self.assertGreaterEqual(price, black_scholes_price(AM_PUT, "put"))

    def test_lsm_reference_lies_in_reported_interval(self) -> None:
        result = solve_american_monte_carlo(AM_PUT, "put", 0, 120, 20, 20, 20_000, 64, 1_729, True, 0.95)
        interval = result["confidence_interval"]
        self.assertLessEqual(interval["lower"], AM_PUT_REFERENCE)
        self.assertGreaterEqual(interval["upper"], AM_PUT_REFERENCE)

    def test_put_exercise_boundary_is_monotone_in_time_to_maturity(self) -> None:
        result = solve_american_finite_difference(AM_PUT, "put", 0, 120, 20, 20, 241, 240, 120)
        boundary = [spot for spot in result["exercise_boundary"]["spots"] if spot is not None]
        self.assertTrue(all(later <= earlier for earlier, later in zip(boundary, boundary[1:])))

    def test_no_dividend_american_call_matches_european_call(self) -> None:
        inputs = MarketInputs(100.0, 100.0, 1.0, 0.20, 0.05, 0.0)
        expected = black_scholes_price(inputs, "call")
        binomial = solve_american_binomial(inputs, "call", 0, 300, 20, 20, 800)
        finite_difference = solve_american_finite_difference(inputs, "call", 0, 300, 20, 20, 241, 240, 300)
        monte_carlo = solve_american_monte_carlo(inputs, "call", 0, 300, 20, 20, 20_000, 64, 1_729, True, 0.95)
        self.assertLessEqual(abs(float(binomial["price"]) - expected), 0.01)
        self.assertLessEqual(abs(float(finite_difference["price"]) - expected), 0.01)
        self.assertLessEqual(monte_carlo["confidence_interval"]["lower"], expected)
        self.assertGreaterEqual(monte_carlo["confidence_interval"]["upper"], expected)
        self.assertTrue(all(spot is None for spot in finite_difference["exercise_boundary"]["spots"][1:]))


if __name__ == "__main__":
    unittest.main()
