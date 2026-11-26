"""Unit tests for eval/scoring.py. Run: python3 -m unittest discover -s eval"""

import unittest

from scoring import LABEL_TOLERANCE, score_label, score_meal, summarize, totals

TRUTH = {"kcal": 500, "protein_g": 30, "carbs_g": 50, "fat_g": 20}


def item(**values):
    return {"grams": 100, "kcal": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, **values}


class TotalsTest(unittest.TestCase):
    def test_sums_every_item(self):
        analysis = {"items": [item(kcal=300, fat_g=10), item(kcal=200, fat_g=5)]}
        self.assertEqual(totals(analysis)["kcal"], 500)
        self.assertEqual(totals(analysis)["fat_g"], 15)
        self.assertEqual(totals(analysis)["grams"], 200)


class MealScoreTest(unittest.TestCase):
    def test_measures_over_and_under_estimates(self):
        over = score_meal({**TRUTH, "kcal": 600}, TRUTH)
        under = score_meal({**TRUTH, "kcal": 400}, TRUTH)
        self.assertEqual((over["kcal_error"], under["kcal_error"]), (100, -100))
        self.assertEqual((over["kcal_abs_error"], under["kcal_abs_error"]), (100, 100))
        self.assertAlmostEqual(over["kcal_pct_error"], 20)

    def test_counts_exactly_20_percent_as_close(self):
        self.assertTrue(score_meal({**TRUTH, "kcal": 600}, TRUTH)["close"])
        self.assertFalse(score_meal({**TRUTH, "kcal": 601}, TRUTH)["close"])

    def test_skips_percentages_for_near_empty_plates(self):
        scores = score_meal({**TRUTH, "kcal": 30}, {**TRUTH, "kcal": 10})
        self.assertIsNone(scores["kcal_pct_error"])
        self.assertIsNone(scores["close"])

    def test_measures_macro_errors_in_grams(self):
        scores = score_meal({**TRUTH, "protein_g": 25, "fat_g": 26}, TRUTH)
        self.assertEqual(scores["protein_g_abs_error"], 5)
        self.assertEqual(scores["fat_g_abs_error"], 6)


class LabelScoreTest(unittest.TestCase):
    truth = {"grams": 55, "kcal": 240, "protein_g": 6, "carbs_g": 34, "fat_g": 0.5}

    def test_accepts_answers_within_rounding(self):
        answer = item(grams=55.4, kcal=241.5, protein_g=6.1, carbs_g=34, fat_g=0.5)
        self.assertTrue(score_label({"items": [answer]}, self.truth)["all_correct"])

    def test_flags_the_field_that_is_wrong(self):
        answer = item(grams=55, kcal=240, protein_g=6, carbs_g=34, fat_g=1)
        scores = score_label({"items": [answer]}, self.truth)
        self.assertFalse(scores["all_correct"])
        self.assertEqual([k for k, ok in scores["fields"].items() if not ok], ["fat_g"])

    def test_fails_when_the_label_is_not_one_item(self):
        self.assertFalse(score_label({"items": []}, self.truth)["all_correct"])
        answer = item(**self.truth)
        self.assertFalse(score_label({"items": [answer, answer]}, self.truth)["all_correct"])


class SummaryTest(unittest.TestCase):
    def test_meal_summary_leaves_failures_out_of_the_averages(self):
        results = [
            {"ms": 1000, "scores": score_meal({**TRUTH, "kcal": 600}, TRUTH)},
            {"ms": 3000, "scores": score_meal({**TRUTH, "kcal": 450}, TRUTH)},
            {"ms": 2000, "reason": "refused"},
        ]
        summary = summarize(results, "meal")
        self.assertEqual((summary["images"], summary["answered"]), (3, 2))
        self.assertEqual(summary["failures"], {"refused": 1})
        self.assertAlmostEqual(summary["median_kcal_pct_error"], 15)
        self.assertEqual(summary["close_rate"], 1)
        self.assertEqual(summary["mean_kcal_error"], 25)
        self.assertEqual(summary["median_seconds"], 2)

    def test_label_summary_reports_field_rates(self):
        right = {key: True for key in LABEL_TOLERANCE}
        good = {"fields": right, "all_correct": True}
        bad = {"fields": {**right, "kcal": False}, "all_correct": False}
        summary = summarize([{"ms": 1, "scores": good}, {"ms": 1, "scores": bad}], "label")
        self.assertEqual(summary["all_correct_rate"], 0.5)
        self.assertEqual(summary["field_correct_rate"]["kcal"], 0.5)

    def test_empty_run(self):
        summary = summarize([], "meal")
        self.assertIsNone(summary["median_kcal_pct_error"])
        self.assertIsNone(summary["median_seconds"])


if __name__ == "__main__":
    unittest.main()
