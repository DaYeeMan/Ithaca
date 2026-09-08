from __future__ import annotations

import argparse
import json
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def fetch(url: str, *, payload: dict[str, object] | None = None) -> tuple[int, bytes]:
    body = json.dumps(payload).encode() if payload is not None else None
    request = Request(url, data=body, headers={"Content-Type": "application/json", "User-Agent": "ithaca-smoke/1"})
    with urlopen(request, timeout=35) as response:
        return response.status, response.read()


def main() -> int:
    parser = argparse.ArgumentParser(description="Smoke-test CapitalCanvas routes and the Ithaca solver API.")
    parser.add_argument("--frontend", required=True)
    parser.add_argument("--api", required=True)
    args = parser.parse_args()
    frontend = args.frontend.rstrip("/")
    api = args.api.rstrip("/")
    try:
        status, html = fetch(frontend)
        assert status == 200 and b"CapitalCanvas" in html and b'id="root"' in html, "frontend did not return the CapitalCanvas shell"
        # These HTTP checks prove frontend fallback. Browser QA separately checks
        # that React renders the correct content for each path and hash target.
        for path in ("/tools/ithaca", "/privacy", "/terms", "/disclaimer", "/not-a-page"):
            route_status, route_html = fetch(f"{frontend}{path}")
            assert route_status == 200 and b"CapitalCanvas" in route_html and b'id="root"' in route_html, f"frontend fallback failed for {path}"
        status, health_raw = fetch(f"{api}/health")
        health = json.loads(health_raw)
        assert status == 200 and health["status"] == "ok", "health check failed"
        status, capabilities_raw = fetch(f"{api}/v1/capabilities")
        capabilities = json.loads(capabilities_raw)
        assert status == 200 and len(capabilities["option_families"]) == 4, "capabilities are incomplete"
        payload = {
            "option_family": "european", "option_side": "call", "methods": ["closed_form"],
            "market": {"spot": 100, "strike": 100, "maturity": 1, "volatility": 0.2, "rate": 0.05, "dividend": 0},
            "surface": {"spot_min": 0, "spot_max": 200, "spot_steps": 20, "time_steps": 20},
        }
        status, solve_raw = fetch(f"{api}/v1/solve", payload=payload)
        solve = json.loads(solve_raw)
        price = solve["results"][0]["price"]
        assert status == 200 and abs(price - 10.450583572185565) <= 1e-10, "closed-form benchmark failed"
    except (AssertionError, HTTPError, URLError, KeyError, ValueError) as error:
        print(f"SMOKE FAILED: {error}", file=sys.stderr)
        return 1
    print(f"SMOKE PASSED: frontend={frontend} api={api} price={price:.10f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
