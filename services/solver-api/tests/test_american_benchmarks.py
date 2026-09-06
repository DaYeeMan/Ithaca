import math
import unittest

import numpy as np


AM_PUT_PUBLISHED = 2.3196
AM_PUT_CRR_EXTRAPOLATED = 2.3195743586


def crr_american_put(steps: int) -> float:
    """Independent test oracle; production solvers must not import this helper."""
    spot = 40.0
    strike = 40.0
    maturity = 1.0
    volatility = 0.20
    rate = 0.06
    dividend = 0.0

    delta_t = maturity / steps
    up = math.exp(volatility * math.sqrt(delta_t))
    down = 1.0 / up
    probability = (math.exp((rate - dividend) * delta_t) - down) / (up - down)
    discount = math.exp(-rate * delta_t)

    up_moves = np.arange(steps + 1)
    spots = spot * up**up_moves * down ** (steps - up_moves)
    values = np.maximum(strike - spots, 0.0)

    for _ in range(steps - 1, -1, -1):
        values = discount * (probability * values[1:] + (1.0 - probability) * values[:-1])
        spots = spots[:-1] / down
        values = np.maximum(values, strike - spots)

    return float(values[0])


class AmericanBenchmarkTests(unittest.TestCase):
    def test_am_put_base_is_locked_by_independent_references(self) -> None:
        coarse = crr_american_put(16_384)
        fine = crr_american_put(32_768)
        extrapolated = 2.0 * fine - coarse

        self.assertAlmostEqual(extrapolated, AM_PUT_CRR_EXTRAPOLATED, places=9)
        self.assertLessEqual(abs(extrapolated - AM_PUT_PUBLISHED), 5e-5)


if __name__ == "__main__":
    unittest.main()
