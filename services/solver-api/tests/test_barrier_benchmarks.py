import unittest
from math import exp, log, pi, sqrt

from scipy.integrate import quad

from app.solvers.barrier import barrier_price
from app.solvers.black_scholes import MarketInputs, black_scholes_price


BASE = MarketInputs(100.0, 100.0, 1.0, 0.20, 0.05, 0.0)
DOWN_OUT_CALL = 8.665471658245675
UP_OUT_CALL = 1.1760653996503727


class BarrierBenchmarkTests(unittest.TestCase):
    @staticmethod
    def _absorbed_density_call(direction: str, barrier: float) -> float:
        log_spot = log(BASE.spot)
        log_barrier = log(barrier)
        drift = BASE.rate - BASE.dividend - 0.5 * BASE.volatility**2
        deviation = BASE.volatility * sqrt(BASE.maturity)

        def density(value: float, mean: float) -> float:
            z = (value - mean) / deviation
            return exp(-0.5 * z * z) / (deviation * sqrt(2.0 * pi))

        mean = log_spot + drift * BASE.maturity
        if direction == "down":
            image_weight = exp(2.0 * drift * (log_barrier - log_spot) / BASE.volatility**2)
            image_mean = 2.0 * log_barrier - log_spot + drift * BASE.maturity
            lower = max(log(BASE.strike), log_barrier)
            upper = mean + 12.0 * deviation
        else:
            image_weight = exp(2.0 * drift * (log_barrier - log_spot) / BASE.volatility**2)
            image_mean = 2.0 * log_barrier - log_spot + drift * BASE.maturity
            lower, upper = log(BASE.strike), log_barrier

        def integrand(value: float) -> float:
            killed_density = density(value, mean) - image_weight * density(value, image_mean)
            return exp(-BASE.rate * BASE.maturity) * (exp(value) - BASE.strike) * killed_density

        return quad(integrand, lower, upper, epsabs=1e-12, epsrel=1e-12)[0]

    def test_down_and_out_call_matches_locked_quantlib_reference(self) -> None:
        self.assertAlmostEqual(
            barrier_price(BASE, "call", "down", "out", 90.0),
            DOWN_OUT_CALL,
            delta=1e-10,
        )

    def test_up_and_out_call_matches_locked_quantlib_reference(self) -> None:
        self.assertAlmostEqual(
            barrier_price(BASE, "call", "up", "out", 120.0),
            UP_OUT_CALL,
            delta=1e-10,
        )

    def test_locked_prices_match_independent_absorbed_density_quadrature(self) -> None:
        self.assertAlmostEqual(self._absorbed_density_call("down", 90.0), DOWN_OUT_CALL, delta=1e-10)
        self.assertAlmostEqual(self._absorbed_density_call("up", 120.0), UP_OUT_CALL, delta=1e-10)

    def test_analytical_knock_in_out_parity_for_every_variant(self) -> None:
        for side in ("call", "put"):
            vanilla = black_scholes_price(BASE, side)
            for direction, barrier in (("down", 90.0), ("up", 120.0)):
                knock_in = barrier_price(BASE, side, direction, "in", barrier)
                knock_out = barrier_price(BASE, side, direction, "out", barrier)
                self.assertAlmostEqual(knock_in + knock_out, vanilla, delta=1e-10)

    def test_breached_barrier_activation_state(self) -> None:
        down_breached = MarketInputs(89.0, 100.0, 1.0, 0.20, 0.05, 0.0)
        vanilla = black_scholes_price(down_breached, "put")
        self.assertEqual(barrier_price(down_breached, "put", "down", "out", 90.0), 0.0)
        self.assertAlmostEqual(barrier_price(down_breached, "put", "down", "in", 90.0), vanilla)


if __name__ == "__main__":
    unittest.main()
