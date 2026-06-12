# Prism — Evaluation Service

A small FastAPI service that scores model responses on **relevance**,
**structure**, and **completeness**. The Node gateway calls it after each model
finishes. It is **optional**: if it isn't running, the app still works and the
Quality column just shows `—`.

## Run it (Windows / macOS / Linux)

From the `eval-service/` folder:

```bash
# 1. Create a virtual environment
python -m venv .venv

# 2. Activate it
#    Windows (PowerShell):
.venv\Scripts\Activate.ps1
#    macOS / Linux:
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. (Optional) enable the LLM judge
cp .env.example .env        # then set JUDGE_PROVIDER + a key

# 5. Start the service
uvicorn app.main:app --reload --port 8000
```

It listens on `http://localhost:8000`, which the gateway already points to.

## Two modes

- **Heuristic-only (default):** deterministic, offline, no keys. Fast baseline.
- **LLM-as-judge:** set `JUDGE_PROVIDER=openai` or `anthropic` and a key in
  `.env`. The judge's 0–100 rating is blended 60/40 with the heuristic score.
  The response's `judged_by` field tells you which mode produced the number.

## Validating the judge (the part worth doing)

An LLM judge is itself noisy. Before trusting it, check it against a small
hand-labelled set:

1. Collect ~30–50 responses and score each yourself 0–100.
2. Run the same responses through `/evaluate` with the judge enabled.
3. Measure agreement (e.g. Pearson/Spearman correlation, or mean absolute error).
4. Report the number. "My judge correlates r=0.8 with human labels" is a far
   stronger claim than "I used an LLM to score it."
