# Prism — Evaluation Lab

This is where you **prove your quality scores are trustworthy**. Instead of
saying "I used an LLM to score responses," you'll be able to say "my evaluator
agrees with human ratings at r = 0.8" — a far stronger claim, and the kind of
thing that stands out in an interview.

The idea: *you* become the ground truth. You rate a batch of responses by hand,
then measure how closely the automated scores match yours.

## Setup (once)

From the project root, using a Python venv (you can reuse the eval-service one):

```bash
# Windows, reusing the eval-service venv:
eval-service\.venv\Scripts\python.exe -m pip install -r lab\requirements.txt

# or make a fresh venv:
python -m venv lab\.venv
lab\.venv\Scripts\python.exe -m pip install -r lab\requirements.txt
```

Make sure `OPENROUTER_API_KEY` is set in the project-root `.env` (same key the
app uses). You'll want to be on a network that can reach OpenRouter.

## The workflow

### 1. Generate a batch

```bash
python lab\run_batch.py --judge
```

This runs every prompt in `prompts.json` across the three models, scores each
response with the heuristics **and** the free LLM judge, and writes
`results.csv`. (Drop `--judge` for heuristics only; add `--limit 6` for a quick
test.)

### 2. Rate the responses yourself

Open `results.csv` (Excel works). For each row, read the `response` and put your
own 0–100 quality score in the **`human_overall`** column. Rate on gut feel —
how good is this answer for the request? Do all rows, ideally without looking at
the `heuristic_overall` / `judge_overall` columns first so you're not biased.

~45 rows takes about 30–40 minutes. Even 20–25 rated rows is enough for a result.

### 3. Measure agreement

```bash
python lab\analyze.py
```

You'll get, for both the heuristic and the judge:

- **Pearson r** — how linearly your ratings and the automated score agree
- **Spearman ρ** — whether they rank responses in the same order
- **MAE** — average gap in points

Plus `scatter_heuristic.png` / `scatter_judge.png` for your README, and an
"average human rating by model" table — your answer to *which model actually won*.

## What to write up

A short results section, e.g.:

> "Across 45 responses, the LLM judge tracked my human ratings at r = 0.82
> (MAE 9.1), versus r = 0.61 for the heuristics — so the judge is the more
> reliable signal, though both rank models consistently. By human rating,
> Model A led on coding while Model B was strongest on content."

Honest numbers are the point. A modest r with a clear explanation of *where* the
scorer breaks down reads better than a suspiciously perfect one.
