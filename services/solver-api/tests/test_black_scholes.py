import math
import unittest

from app.solvers.black_scholes import MarketInputs, black_scholes_price, solve_surface


BASE = MarketInputs(
    spot=100.0,
    strike=100.0,
    maturity=1.0,
    volatility=0.2,
    rate=0.05,
    dividend=0.0,
)


class BlackScholesTests(unittest.TestCase):
    def test_locked_atm_benchmarks(self) -> None:
        self.assertAlmostEqual(black_scholes_price(BASE, "call"), 10.450583572185565, places=10)
        self.assertAlmostEqual(black_scholes_price(BASE, "put"), 5.573526022256971, places=10)

    def test_put_call_parity(self) -> None:
        call = black_scholes_price(BASE, "call")
        put = black_scholes_price(BASE, "put")
        parity = BASE.spot * math.exp(-BASE.dividend * BASE.maturity) - BASE.strike * math.exp(
            -BASE.rate * BASE.maturity
        )
        self.assertAlmostEqual(call - put, parity, places=10)

    def test_terminal_payoff(self) -> None:
        self.assertEqual(black_scholes_price(BASE, "call", tau=0), 0.0)
        self.assertEqual(black_scholes_price(BASE, "put", tau=0), 0.0)

    def test_call_monotonic_in_spot(self) -> None:
        prices = [
            black_scholes_price(
                MarketInputs(spot, BASE.strike, BASE.maturity, BASE.volatility, BASE.rate, BASE.dividend),
                "call",
            )
            for spot in (50.0, 80.0, 100.0, 120.0, 150.0)
        ]
        self.assertEqual(prices, sorted(prices))

    def test_surface_shape(self) -> None:
        result = solve_surface(BASE, "call", 0, 300, 31, 21)
        surface = result["surface"]
        self.assertEqual(len(surface["spots"]), 31)
        self.assertEqual(len(surface["times_to_maturity"]), 21)
        self.assertEqual(len(surface["prices"]), 21)
        self.assertTrue(all(len(row) == 31 for row in surface["prices"]))


if __name__ == "__main__":
    unittest.main()
