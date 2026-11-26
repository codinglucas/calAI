# Accuracy eval

The automated tests in `__tests__/` check that the code behaves correctly, with the AI faked. This eval checks the other half: **how close the real AI's numbers are to the truth.** It sends photos with known nutrition through the app's own analysis code and scores the answers.

Run it by hand when you change the prompt, the model or the provider, and compare the reports. It isn't part of CI: it makes real AI calls, takes minutes, and its results vary a little from run to run.

## Latest results

First run, November 26, 2026, on Gemini `gemini-3.5-flash-lite` ([labels report](results/20261126-1942-labels-gemini.md), [meals report](results/20261126-1945-nutrition5k-gemini.md)):

| Dataset                | Result                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| Labels (24)            | Every value read correctly on all 24, including kJ-only, "<1g", tilted, faint and small labels |
| Nutrition5k meals (50) | Median calorie error 27%; 34% of meals within ±20%; on average 30 kcal under                   |

What the meal run shows:

- **Portions are about right; contents are the problem.** The median estimated weight was 98% of the true weight. The big misses came from what was in the food, such as dressing and fat the camera can't see.
- **The largest percentage misses are small dishes.** For example, a 22 kcal salad guessed at 90 kcal is a 309% error. The median is the fairer headline.
- **Labels are a ceiling, not the real-world rate.** They're clean digital drawings, so 100% says the reading logic works. Photos of real packaging will score lower. Adding harder cases, or your own photos of real labels, would make this dataset more useful.

## How it works

```
eval/run.py  ──for each image──▶  node scripts/analyze-image.ts <image> <mode>
     │                                 │
     │                                 └─ lib/ai/analyzeMeal.ts (the app's real prompt,
     │                                    schema, bounds and retry) ─▶ Gemini or Claude
     │◀──────────── JSON answer ───────┘
     ├─ eval/scoring.py compares it with the dataset's true values
     └─ writes eval/results/<time>-<dataset>-<provider>.json and .md
```

- **`scripts/analyze-image.ts`** runs the app's `analyzeMeal` on one image file and prints the result as JSON. Node runs the TypeScript directly; `scripts/register-ts.mjs` resolves the app's `@/` imports. Because it calls the real code, the eval can't drift from what the app does.
- **`eval/run.py`** loads a dataset, calls the bridge for each image, scores the answers and writes the report. It uses only Python's standard library.
- **`eval/scoring.py`** holds all the scoring math, unit-tested in `eval/test_scoring.py`.

## Datasets

| Dataset       | Mode  | Images                                       | Truth comes from                            |
| ------------- | ----- | -------------------------------------------- | ------------------------------------------- |
| `labels`      | label | 24 generated nutrition labels                | The values printed on them                  |
| `nutrition5k` | meal  | 50 cafeteria dishes, photographed from above | Every ingredient weighed by the researchers |
| `own`         | meal  | Your own photos                              | Meals you weighed yourself                  |

Images live in `eval/data/`, which Git ignores. Recreate them with the commands below.

### Labels

`eval/labels/generate.mjs` draws 24 labels with Next's image renderer and writes the values the app should read to `eval/data/labels/manifest.json`. The cases cover the label prompt's rules:

- US style (one per-serving column), including a drink in mL
- EU style (per 100 g only, energy in kJ and kcal)
- both columns, where the app should pick per serving
- energy only in kJ, where the app should divide by 4.184
- "<1g", which the app should read as 0.5 g
- harder photos: tilted, faint and small

The truth is exact, so this measures reading, not judgment. The labels are clean digital drawings; real photos of packaging are harder.

### Nutrition5k

`eval/download_nutrition5k.py` downloads 50 dishes from [Nutrition5k](https://github.com/google-research-datasets/Nutrition5k) (Thames et al., CVPR 2021). The dataset is released by Google under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), which allows any use with credit. Each dish has an overhead photo and per-dish calories, mass, protein, carbs and fat from weighed ingredients.

- **Which dishes:** from the dataset's own test split, only those with an overhead photo and at least 20 kcal. They're shuffled with a fixed seed, so every download gets the same 50.
- **Size:** about 19 MB for 50 dishes.
- **Bias:** the dishes come from a few cafeterias in California and are photographed straight down by a fixed rig. That's useful for comparing versions, but different from angled phone photos of home cooking.

### Your own meals

For numbers that reflect real use, photograph meals you've weighed and put them in `eval/data/own/`:

```
eval/data/own/
  own.csv
  dinner-1.jpg
  ...
```

`own.csv` needs these columns, with whole-meal totals:

```csv
image,kcal,protein_g,carbs_g,fat_g
dinner-1.jpg,640,42,55,24
```

Work out the truth from weights and package labels or a nutrition database. These photos never leave your Mac except to go to the AI provider, which matters on Gemini's free tier (see Privacy below).

## Running it

Requirements: Node (the version the app uses), Python 3.10 or newer, and an AI key in `.env.local`.

```bash
node eval/labels/generate.mjs
python3 eval/download_nutrition5k.py
python3 eval/run.py labels
python3 eval/run.py nutrition5k
```

Options for `run.py`:

| Option                         | Meaning                                                             |
| ------------------------------ | ------------------------------------------------------------------- |
| `--limit N`                    | Only the first N images, for a quick check                          |
| `--provider gemini\|anthropic` | Overrides `AI_PROVIDER` from `.env.local` for this run              |
| `--delay S`                    | Seconds between images (default 4), to stay under per-minute quotas |

If the provider is unavailable for an image, usually because of a quota limit, the runner waits 30 seconds and tries once more. After that it records the image as a failure.

Run the scoring tests (no AI calls) with:

```bash
python3 -m unittest discover -s eval
```

CI runs these on every pull request.

## Reading the results

Each run writes two files to `eval/results/`, named `<time>-<dataset>-<provider>`:

- **`.md`**: the summary, for reading and for comparing runs.
- **`.json`**: every image's answer, truth and score, for digging into mistakes.

The reports record the provider, model and commit, so a result always says what produced it.

### Meal metrics

| Metric                           | Meaning                                                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Median calorie error             | Half the meals were off by less than this percentage. The headline number; the median ignores a few wild misses. |
| Within ±20%                      | Share of meals whose calories landed within 20% of the truth                                                     |
| Mean calorie error (absolute)    | Average size of the miss, in kcal                                                                                |
| Mean calorie error (signed)      | Positive means the AI tends to overestimate, negative means it underestimates                                    |
| Mean protein / carbs / fat error | Average miss per macro, in grams                                                                                 |

Dishes under 20 kcal are left out of the percentage metrics, where a tiny miss would look huge.

### Label metrics

| Metric                     | Meaning                                                               |
| -------------------------- | --------------------------------------------------------------------- |
| Every value read correctly | Share of labels where grams, calories and all three macros were right |
| Per field                  | How often each value was right                                        |

"Right" allows for rounding: ±1 g for the serving, ±2 kcal (covers the kJ conversion) and ±0.15 g for macros.

### Failures

Images that got no usable answer are counted under **Failures** with the reason: `refused`, `invalid_output` (the reply didn't pass the app's checks twice), `unavailable` (quota or outage), `no_food_found` or `error`. They count against the run but are left out of the error averages, so always read both.

### How much to trust a difference

Fifty dishes give a rough picture, not a precise one. Model answers also vary between runs. Treat a difference of a few points between two runs as noise unless it repeats. Rerunning the same dataset is the quickest way to see how much a number moves on its own.

## Cost, quotas and privacy

- **Calls:** each image costs one AI call, or two if the first answer fails the app's checks. A full run of both datasets is about 75–150 calls.
- **Gemini's free tier:** limits requests per minute and per day, which the default 4-second delay is meant to respect. On the free tier, Google may use what it receives to improve its products. That's fine for these public and generated images; think twice before running your own photos through a free key.
- **Claude:** set `ANTHROPIC_API_KEY` in `.env.local` and pass `--provider anthropic`. Calls are billed to your Anthropic account.
- **No storage:** the eval never uploads images anywhere except the AI provider, and reports contain numbers and the AI's notes, not images.

## Differences from the app

- **Image size:** the app shrinks photos in the browser to at most 1024 px (1600 px for labels) and re-encodes them as JPEG. The eval sends the dataset files as they are: Nutrition5k photos are 640×480 PNGs and the labels are 900×700 PNGs. Both are within the sizes the app sends.
- **Label amounts:** label mode scores what the app reads off the label. The amount step that follows, where the user says how much they had, is plain arithmetic covered by the unit tests.

## Troubleshooting

**`CERTIFICATE_VERIFY_FAILED` when downloading.** Python from the python.org installer comes without trusted certificates. Run its "Install Certificates" command (in `/Applications/Python 3.x/`), or point Python at the macOS certificates for one command:

```bash
SSL_CERT_FILE=/etc/ssl/cert.pem python3 eval/download_nutrition5k.py
```

**Every image fails with `unavailable`.** Check the key and provider in `.env.local`, or wait for the quota to reset. Running `node --env-file-if-exists=.env.local --import ./scripts/register-ts.mjs scripts/analyze-image.ts eval/data/labels/us-granola.png label` shows one raw answer.

## Credits

Nutrition5k: Quin Thames, Arjun Karpur, Wade Norris, Fangting Xia, Liviu Panait, Tobias Weyand and Jack Sim. "Nutrition5k: Towards Automatic Nutritional Understanding of Generic Food." CVPR 2021. Released under CC BY 4.0.
