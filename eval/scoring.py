"""Scoring for the accuracy eval: compares the app's answers with the truth.

Kept free of I/O so it can be unit-tested (eval/test_scoring.py).
"""

import statistics
from collections import Counter

MACROS = ("protein_g", "carbs_g", "fat_g")
NUTRIENTS = ("kcal", *MACROS)

# A meal estimate within this share of the true calories counts as close.
CLOSE_PCT = 20
# Below this, a percentage error would mostly measure noise (an empty plate).
MIN_KCAL_FOR_PCT = 20

# How far a label reading can be from the printed value and still count as
# right: rounding, kJ conversion and "<1 g" read as 0.5 all land inside these.
LABEL_TOLERANCE = {"grams": 1, "kcal": 2, "protein_g": 0.15, "carbs_g": 0.15, "fat_g": 0.15}


def totals(analysis: dict) -> dict:
    """Sums the app's items into whole-meal totals."""
    items = analysis.get("items", [])
    return {key: sum(item[key] for item in items) for key in ("grams", *NUTRIENTS)}


def score_meal(predicted: dict, truth: dict) -> dict:
    kcal_error = predicted["kcal"] - truth["kcal"]
    pct = None
    if truth["kcal"] >= MIN_KCAL_FOR_PCT:
        pct = abs(kcal_error) / truth["kcal"] * 100
    return {
        "kcal_error": kcal_error,
        "kcal_abs_error": abs(kcal_error),
        "kcal_pct_error": pct,
        "close": None if pct is None else pct <= CLOSE_PCT,
        **{f"{key}_abs_error": abs(predicted[key] - truth[key]) for key in MACROS},
    }


def score_label(analysis: dict, truth: dict) -> dict:
    items = analysis.get("items", [])
    if len(items) != 1:
        fields = {key: False for key in LABEL_TOLERANCE}
    else:
        item = items[0]
        fields = {
            key: abs(item[key] - truth[key]) <= tolerance
            for key, tolerance in LABEL_TOLERANCE.items()
        }
    return {"fields": fields, "all_correct": all(fields.values())}


def _rate(flags: list[bool]) -> float | None:
    return sum(flags) / len(flags) if flags else None


def _mean(values: list[float]) -> float | None:
    return statistics.fmean(values) if values else None


def summarize(results: list[dict], mode: str) -> dict:
    """Aggregates per-image results. Failed images count against the success
    rate but are left out of the error averages, which are reported separately."""
    scored = [r for r in results if r.get("scores")]
    summary = {
        "images": len(results),
        "answered": len(scored),
        "failures": dict(Counter(r["reason"] for r in results if not r.get("scores"))),
        "median_seconds": (
            statistics.median(r["ms"] for r in results if "ms" in r) / 1000
            if any("ms" in r for r in results)
            else None
        ),
    }
    if mode == "label":
        summary["all_correct_rate"] = _rate([r["scores"]["all_correct"] for r in scored])
        summary["field_correct_rate"] = {
            key: _rate([r["scores"]["fields"][key] for r in scored]) for key in LABEL_TOLERANCE
        }
    else:
        pct = [r["scores"]["kcal_pct_error"] for r in scored]
        pct = [p for p in pct if p is not None]
        summary["median_kcal_pct_error"] = statistics.median(pct) if pct else None
        summary["close_rate"] = _rate([p <= CLOSE_PCT for p in pct])
        summary["mean_kcal_abs_error"] = _mean([r["scores"]["kcal_abs_error"] for r in scored])
        summary["mean_kcal_error"] = _mean([r["scores"]["kcal_error"] for r in scored])
        summary["mean_macro_abs_error"] = {
            key: _mean([r["scores"][f"{key}_abs_error"] for r in scored]) for key in MACROS
        }
    return summary
