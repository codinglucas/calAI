# Accuracy eval: nutrition5k

- **Run:** 2026-11-26 19:45 UTC (commit `cf1f3d5`)
- **Provider:** gemini, model gemini-3.5-flash-lite
- **Images:** 50, answered 50
- **Failures:** none
- **Median time per image:** 2.0 s

| Metric                                       | Value    |
| -------------------------------------------- | -------- |
| Median calorie error                         | 27.2%    |
| Within ±20% of true calories                 | 34%      |
| Mean calorie error (absolute)                | 79 kcal  |
| Mean calorie error (signed: + over, − under) | -30 kcal |
| Mean protein error                           | 7.0 g    |
| Mean carbs error                             | 6.4 g    |
| Mean fat error                               | 7.0 g    |
