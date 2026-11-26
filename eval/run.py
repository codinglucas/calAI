"""Runs the accuracy eval: sends each image in a dataset through the app's own
analysis code (scripts/analyze-image.ts) and scores the answers.

    python3 eval/run.py labels|nutrition5k|own [--limit N] [--provider gemini] [--delay 4]

Writes eval/results/<time>-<dataset>-<provider>.json (every answer) and .md
(the summary). Each image costs one or two real AI calls. See eval/README.md.
"""

import argparse
import csv
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from scoring import CLOSE_PCT, LABEL_TOLERANCE, MACROS, score_label, score_meal, summarize, totals

EVAL = Path(__file__).parent
ROOT = EVAL.parent
DATA = EVAL / "data"
RESULTS = EVAL / "results"
DATASETS = ("labels", "nutrition5k", "own")
# Waits before retrying an image when the provider was unavailable (usually a quota limit).
RETRY_WAIT_SECONDS = 30


def load_dataset(name: str) -> tuple[Path, list[dict]]:
    folder = DATA / name
    if name == "own":
        # own.csv columns: image,kcal,protein_g,carbs_g,fat_g
        with open(folder / "own.csv", newline="") as file:
            rows = list(csv.DictReader(file))
        cases = [
            {
                "id": row["image"],
                "image": row["image"],
                "mode": "meal",
                "truth": {key: float(row[key]) for key in ("kcal", *MACROS)},
            }
            for row in rows
        ]
        return folder, cases
    return folder, json.loads((folder / "manifest.json").read_text())


def analyze(image: Path, mode: str, provider: str | None) -> dict:
    env = {**os.environ, **({"AI_PROVIDER": provider} if provider else {})}
    command = [
        "node",
        "--env-file-if-exists=.env.local",
        "--import",
        "./scripts/register-ts.mjs",
        "scripts/analyze-image.ts",
        str(image),
        mode,
    ]
    done = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True, timeout=180)
    lines = done.stdout.strip().splitlines()
    if done.returncode != 0 or not lines:
        return {"ok": False, "reason": "error", "detail": done.stderr.strip()[-300:]}
    return json.loads(lines[-1])


def run_case(folder: Path, case: dict, provider: str | None) -> dict:
    reply = analyze(folder / case["image"], case["mode"], provider)
    if not reply.get("ok") and reply.get("reason") == "unavailable":
        time.sleep(RETRY_WAIT_SECONDS)
        reply = analyze(folder / case["image"], case["mode"], provider)

    result = {"id": case["id"], "truth": case["truth"], **reply}
    if reply.get("ok"):
        analysis = reply["analysis"]
        if case["mode"] == "label":
            result["scores"] = score_label(analysis, case["truth"])
        elif analysis["items"]:
            result["predicted"] = totals(analysis)
            result["scores"] = score_meal(result["predicted"], case["truth"])
        else:
            result["reason"] = "no_food_found"
    return result


def fmt(value, suffix="", digits=1):
    return "n/a" if value is None else f"{value:.{digits}f}{suffix}"


def pct(rate):
    return "n/a" if rate is None else f"{rate * 100:.0f}%"


def markdown(meta: dict, summary: dict, mode: str) -> str:
    lines = [
        f"# Accuracy eval: {meta['dataset']}",
        "",
        f"- **Run:** {meta['started']} (commit `{meta['commit']}`)",
        f"- **Provider:** {meta['provider']}, model {meta['model']}",
        f"- **Images:** {summary['images']}, answered {summary['answered']}",
        f"- **Failures:** {summary['failures'] or 'none'}",
        f"- **Median time per image:** {fmt(summary['median_seconds'], ' s')}",
        "",
    ]
    if mode == "label":
        lines += [
            f"**Every value read correctly:** {pct(summary['all_correct_rate'])} of answered labels",
            "",
            "| Field | Correct | Tolerance |",
            "| --- | --- | --- |",
            *(
                f"| {key} | {pct(rate)} | ±{LABEL_TOLERANCE[key]} |"
                for key, rate in summary["field_correct_rate"].items()
            ),
        ]
    else:
        lines += [
            "| Metric | Value |",
            "| --- | --- |",
            f"| Median calorie error | {fmt(summary['median_kcal_pct_error'], '%')} |",
            f"| Within ±{CLOSE_PCT}% of true calories | {pct(summary['close_rate'])} |",
            f"| Mean calorie error (absolute) | {fmt(summary['mean_kcal_abs_error'], ' kcal', 0)} |",
            f"| Mean calorie error (signed: + over, − under) | {fmt(summary['mean_kcal_error'], ' kcal', 0)} |",
            *(
                f"| Mean {key.removesuffix('_g')} error | {fmt(value, ' g')} |"
                for key, value in summary["mean_macro_abs_error"].items()
            ),
        ]
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the calAI accuracy eval.")
    parser.add_argument("dataset", choices=DATASETS)
    parser.add_argument("--limit", type=int, help="only the first N images")
    parser.add_argument("--provider", choices=("gemini", "anthropic"), help="default: AI_PROVIDER")
    parser.add_argument("--delay", type=float, default=4, help="seconds between images (default 4)")
    args = parser.parse_args()

    folder, cases = load_dataset(args.dataset)
    cases = cases[: args.limit] if args.limit else cases
    mode = cases[0]["mode"] if cases else "meal"
    started = datetime.now(timezone.utc)

    results = []
    for index, case in enumerate(cases, 1):
        if index > 1:
            time.sleep(args.delay)
        result = run_case(folder, case, args.provider)
        results.append(result)
        status = "ok" if result.get("scores") else result.get("reason")
        print(f"[{index}/{len(cases)}] {case['id']}: {status}", file=sys.stderr)

    answered = next((r for r in results if r.get("provider")), {})
    commit = subprocess.run(
        ["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True, text=True
    ).stdout.strip()
    meta = {
        "dataset": args.dataset,
        "started": started.strftime("%Y-%m-%d %H:%M UTC"),
        "commit": commit or "unknown",
        "provider": answered.get("provider", args.provider or "unknown"),
        "model": answered.get("model", "unknown"),
    }
    summary = summarize(results, mode)

    RESULTS.mkdir(exist_ok=True)
    stem = f"{started:%Y%m%d-%H%M}-{args.dataset}-{meta['provider']}"
    (RESULTS / f"{stem}.json").write_text(
        json.dumps({"meta": meta, "summary": summary, "results": results}, indent=2) + "\n"
    )
    report = markdown(meta, summary, mode)
    (RESULTS / f"{stem}.md").write_text(report)
    print(f"\n{report}\nSaved eval/results/{stem}.json and .md", file=sys.stderr)


if __name__ == "__main__":
    main()
