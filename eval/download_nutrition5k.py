"""Downloads a fixed sample of Nutrition5k dishes for the accuracy eval.

Takes dishes from the dataset's own test split that have an overhead photo,
skips near-empty plates, and picks the same sample every time (fixed seed), so
runs stay comparable. Writes eval/data/nutrition5k/<dish>.png and manifest.json.

Nutrition5k (Thames et al., CVPR 2021) is released by Google under CC BY 4.0.

    python3 eval/download_nutrition5k.py [--count 50]
"""

import argparse
import csv
import io
import json
import random
import sys
import urllib.error
import urllib.request
from pathlib import Path

BUCKET = "https://storage.googleapis.com/nutrition5k_dataset/nutrition5k_dataset"
OUT = Path(__file__).parent / "data" / "nutrition5k"
SEED = 5000
# Percentage error means little on a nearly empty plate.
MIN_KCAL = 20


def fetch(path: str) -> bytes:
    with urllib.request.urlopen(f"{BUCKET}/{path}", timeout=60) as response:
        return response.read()


def load_truth() -> dict[str, dict]:
    truth = {}
    for cafe in ("cafe1", "cafe2"):
        text = fetch(f"metadata/dish_metadata_{cafe}.csv").decode()
        for row in csv.reader(io.StringIO(text)):
            dish_id, kcal, grams, fat, carbs, protein = row[0], *map(float, row[1:6])
            truth[dish_id] = {
                "kcal": round(kcal, 1),
                "grams": round(grams, 1),
                "protein_g": round(protein, 1),
                "carbs_g": round(carbs, 1),
                "fat_g": round(fat, 1),
            }
    return truth


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--count", type=int, default=50, help="dishes to download (default 50)")
    args = parser.parse_args()

    truth = load_truth()
    test_ids = fetch("dish_ids/splits/depth_test_ids.txt").decode().split()
    candidates = sorted(i for i in test_ids if i in truth and truth[i]["kcal"] >= MIN_KCAL)
    random.Random(SEED).shuffle(candidates)

    OUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    for dish_id in candidates:
        if len(manifest) == args.count:
            break
        image = OUT / f"{dish_id}.png"
        if not image.exists():
            try:
                image.write_bytes(fetch(f"imagery/realsense_overhead/{dish_id}/rgb.png"))
            except urllib.error.HTTPError:
                continue  # no overhead photo for this dish; take the next one
        manifest.append(
            {"id": dish_id, "image": image.name, "mode": "meal", "truth": truth[dish_id]}
        )
        print(f"\r{len(manifest)}/{args.count} dishes", end="", file=sys.stderr)

    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"\nWrote {len(manifest)} dishes to {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
