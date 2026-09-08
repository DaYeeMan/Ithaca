"""Generate the static home-card preview from Black–Scholes call values.

Run from the repository root. This SVG is decorative: axes are deliberately
omitted, and it never replaces the labelled numerical charts inside Ithaca.
"""
from math import erf, exp, log, sqrt
from pathlib import Path


def price(spot: float, time: float) -> float:
    sigma, rate, strike = 0.25, 0.05, 100
    d1 = (log(spot / strike) + (rate + sigma * sigma / 2) * time) / (sigma * sqrt(time))
    d2 = d1 - sigma * sqrt(time)
    normal = lambda z: (1 + erf(z / sqrt(2))) / 2
    return spot * normal(d1) - strike * exp(-rate * time) * normal(d2)


def point(s: float, t: float) -> str:
    value = price(40 + 130 * s, 0.05 + 1.45 * t)
    return f'{20 + 175 * t + 235 * s:.2f},{215 + 43 * t - 35 * s - 165 * value / 80:.2f}'


colors = ['#332973', '#303d91', '#235cad', '#127fbb', '#009eae', '#04bca0', '#40c883', '#89d257', '#c9db37', '#f0dc28', '#ffe12e', '#ffdf35']
parts = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 280">']
for s in reversed(range(12)):
    for t in range(6):
        corners = [point(s/12, t/6), point((s+1)/12, t/6), point((s+1)/12, (t+1)/6), point(s/12, (t+1)/6)]
        parts.append(f'<polygon points="{" ".join(corners)}" fill="{colors[s]}" stroke="#ebf1dc" stroke-opacity=".76" stroke-width=".65" stroke-linejoin="round"/>')
parts.append('</svg>')
Path('apps/web/public/ithaca-surface.svg').write_text('\n'.join(parts) + '\n', encoding='utf-8')
