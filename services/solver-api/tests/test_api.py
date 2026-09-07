import unittest
from time import sleep
from time import perf_counter
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.execution import check_execution
from app.models import SolveRequest


BASE_REQUEST = {
    "option_family": "european",
    "option_side": "call",
    "methods": ["closed_form", "finite_difference", "monte_carlo"],
    "market": {
        "spot": 100,
        "strike": 100,
        "maturity": 1,
        "volatility": 0.2,
        "rate": 0.05,
        "dividend": 0,
    },
    "surface": {"spot_min": 0, "spot_max": 300, "spot_steps": 20, "time_steps": 20},
    "finite_difference": {"spot_steps": 241, "time_steps": 240, "domain_max": 300},
    "monte_carlo": {
        "paths": 20_000,
        "steps": 64,
        "seed": 1_729,
        "antithetic": True,
        "confidence_level": 0.95,
    },
}


class ApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_capabilities_publish_phase_two_methods_and_limits(self) -> None:
        response = self.client.get("/v1/capabilities")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(
            [method["id"] for method in body["methods"]],
            ["closed_form", "binomial", "finite_difference", "monte_carlo"],
        )
        self.assertEqual(body["limits"]["total_estimated_operations"], 120_000_000)

    def test_solve_returns_comparable_method_results(self) -> None:
        started_at = perf_counter()
        response = self.client.post("/v1/solve", json=BASE_REQUEST)
        elapsed = perf_counter() - started_at
        self.assertEqual(response.status_code, 200, response.text)
        self.assertLess(elapsed, 5.0)
        body = response.json()
        self.assertEqual([result["method"] for result in body["results"]], BASE_REQUEST["methods"])
        self.assertLessEqual(body["results"][1]["reference_error"], 0.02)
        monte_carlo = body["results"][2]
        reference = body["results"][0]["price"]
        self.assertLessEqual(monte_carlo["confidence_interval"]["lower"], reference)
        self.assertGreaterEqual(monte_carlo["confidence_interval"]["upper"], reference)

    def test_work_budget_rejects_expensive_request(self) -> None:
        request = {
            **BASE_REQUEST,
            "surface": {"spot_min": 0, "spot_max": 300, "spot_steps": 160, "time_steps": 160},
            "monte_carlo": {**BASE_REQUEST["monte_carlo"], "paths": 200_000},
        }
        response = self.client.post("/v1/solve", json=request)
        self.assertEqual(response.status_code, 422)
        self.assertIn("operation budget", response.text)

    def test_barrier_memory_budget_rejects_large_path_grid(self) -> None:
        request = {
            **BASE_REQUEST,
            "option_family": "barrier",
            "methods": ["monte_carlo"],
            "monte_carlo": {**BASE_REQUEST["monte_carlo"], "paths": 20_000, "steps": 512},
        }
        response = self.client.post("/v1/solve", json=request)
        self.assertEqual(response.status_code, 422)
        self.assertIn("4,000,000 node memory budget", response.text)

    def test_health_diagnostics_and_request_id_are_production_safe(self) -> None:
        response = self.client.get("/health", headers={"X-Request-ID": "smoke-123"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["X-Request-ID"], "smoke-123")
        self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(response.json()["version"], "0.6.0")
        diagnostics = self.client.get("/v1/diagnostics").json()
        self.assertEqual(diagnostics["status"], "ready")
        self.assertGreaterEqual(diagnostics["max_concurrent_solves"], 1)

    def test_server_deadline_cooperatively_stops_solver(self) -> None:
        def slow_solve(_request):
            while True:
                check_execution()
                sleep(0.01)

        with patch("app.main.REQUEST_TIMEOUT_SECONDS", 1), patch("app.main._solve", side_effect=slow_solve):
            response = self.client.post("/v1/solve", json={**BASE_REQUEST, "methods": ["closed_form"]})
        self.assertEqual(response.status_code, 504)
        self.assertEqual(response.json()["error"]["code"], "solve_timeout")

    def test_domain_must_cover_requested_surface(self) -> None:
        request = {**BASE_REQUEST, "finite_difference": {**BASE_REQUEST["finite_difference"], "domain_max": 250}}
        with self.assertRaisesRegex(ValueError, "cover spot and surface maximum"):
            SolveRequest.model_validate(request)

    def test_capabilities_publish_american_method_rules(self) -> None:
        body = self.client.get("/v1/capabilities").json()
        american = next(family for family in body["option_families"] if family["id"] == "american")
        self.assertEqual(american["status"], "available")
        self.assertEqual(american["methods"], ["binomial", "finite_difference", "monte_carlo"])

    def test_rejects_closed_form_for_american_contracts(self) -> None:
        request = {**BASE_REQUEST, "option_family": "american", "methods": ["closed_form"]}
        response = self.client.post("/v1/solve", json=request)
        self.assertEqual(response.status_code, 422)
        self.assertIn("not compatible", response.text)

    def test_american_solve_returns_all_phase_three_methods(self) -> None:
        request = {
            **BASE_REQUEST,
            "option_family": "american",
            "option_side": "put",
            "methods": ["binomial", "finite_difference", "monte_carlo"],
            "market": {"spot": 40, "strike": 40, "maturity": 1, "volatility": 0.2, "rate": 0.06, "dividend": 0},
            "surface": {"spot_min": 0, "spot_max": 120, "spot_steps": 20, "time_steps": 20},
            "finite_difference": {"spot_steps": 241, "time_steps": 240, "domain_max": 120},
            "binomial": {"steps": 800},
        }
        started_at = perf_counter()
        response = self.client.post("/v1/solve", json=request)
        elapsed = perf_counter() - started_at
        self.assertEqual(response.status_code, 200, response.text)
        self.assertLess(elapsed, 5.0)
        results = response.json()["results"]
        self.assertEqual([result["method"] for result in results], request["methods"])
        self.assertIsNotNone(results[1]["exercise_boundary"])
        self.assertLessEqual(results[1]["reference_error"], 0.01)

    def test_capabilities_publish_barrier_method_rules(self) -> None:
        body = self.client.get("/v1/capabilities").json()
        barrier = next(family for family in body["option_families"] if family["id"] == "barrier")
        self.assertEqual(barrier["status"], "available")
        self.assertEqual(barrier["methods"], ["closed_form", "finite_difference", "monte_carlo"])

    def test_barrier_solve_returns_phase_four_methods_and_state(self) -> None:
        request = {
            **BASE_REQUEST,
            "option_family": "barrier",
            "barrier": {"direction": "down", "style": "out", "level": 90, "monitoring": "continuous", "rebate": 0},
        }
        response = self.client.post("/v1/solve", json=request)
        self.assertEqual(response.status_code, 200, response.text)
        results = response.json()["results"]
        self.assertEqual([result["method"] for result in results], request["methods"])
        self.assertAlmostEqual(results[0]["price"], 8.665471658245675, delta=1e-10)
        self.assertFalse(results[0]["diagnostics"]["barrier_triggered"])
        self.assertLessEqual(results[1]["reference_error"], 0.01)

    def test_capabilities_publish_asian_method_rules(self) -> None:
        body = self.client.get("/v1/capabilities").json()
        asian = next(family for family in body["option_families"] if family["id"] == "asian")
        self.assertEqual(asian["status"], "available")
        self.assertEqual(asian["methods"], ["closed_form", "finite_difference", "monte_carlo"])
        self.assertEqual(asian["closed_form_average"], "geometric")

    def test_asian_geometric_solve_returns_phase_five_methods(self) -> None:
        request = {
            **BASE_REQUEST,
            "option_family": "asian",
            "asian": {
                "average_type": "geometric", "observations": 12, "average_state": 100,
                "monitoring": "discrete", "includes_initial_spot": False,
            },
        }
        response = self.client.post("/v1/solve", json=request)
        self.assertEqual(response.status_code, 200, response.text)
        results = response.json()["results"]
        self.assertAlmostEqual(results[0]["price"], 5.94020022163352, delta=1e-12)
        self.assertLessEqual(results[1]["reference_error"], 0.03)
        self.assertEqual(results[2]["diagnostics"]["observations"], 12)
        self.assertFalse(results[2]["diagnostics"]["includes_initial_spot"])

    def test_asian_arithmetic_rejects_closed_form(self) -> None:
        request = {
            **BASE_REQUEST,
            "option_family": "asian",
            "methods": ["closed_form"],
            "asian": {"average_type": "arithmetic", "observations": 12, "average_state": 100},
        }
        response = self.client.post("/v1/solve", json=request)
        self.assertEqual(response.status_code, 422)
        self.assertIn("only compatible with geometric", response.text)


if __name__ == "__main__":
    unittest.main()
