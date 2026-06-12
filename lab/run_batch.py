#!/usr/bin/env python3
"""
Batch runner for evaluator calibration.

For every prompt in prompts.json, generate a response from each model (via the
free OpenRouter endpoint), score it with the heuristics, and — if --judge is
passed — also with the free LLM judge. Everything is written to results.csv with
an empty `human_overall` column for you to fill in.

Usage (with your venv's python, from the project root):
    python lab/run_batch.py                 # heuristic scores only
    python lab/run_batch.py --judge         # also add LLM-judge scores
    python lab/run_batch.py --limit 6       # quick test on the first 6 prompts

Needs OPENROUTER_API_KEY in the project root .env (same key the app uses).
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import json
import os
import pathlib
import sys

import httpx
from dotenv import load_dotenv

ROOT = pathlib.Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

# Reuse the exact scoring logic the live service uses.
sys.path.insert(0, str(ROOT / "eval-service"))
from app.evaluators import heuristic_scores, judge_scores  # noqa: E402

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
KEY = os.getenv("OPENROUTER_API_KEY")

# Edit this list to match the models you want to compare. These mirror the
# app's default free slugs — swap any ":free" slug from openrouter.ai/models.
MODELS = [
    {"label": "GPT-OSS 120B", "id": "openai/gpt-oss-120b:free"},
    {"label": "Nemotron 3 Super", "id": "nvidia/nemotron-3-super-120b-a12b:free"},
    {"label": "Gemma 4 31B", "id": "google/gemma-4-31b-it:free"},
]

OVERALL_WEIGHTS = {"relevance": 0.45, "structure": 0.2, "completeness": 0.35}


def overall_from_axes(axes: dict[str, float]) -> float:
    return round(sum(OVERALL_WEIGHTS[k] * axes[k] for k in OVERALL_WEIGHTS), 1)


async def generate(client: httpx.AsyncClient, model_id: str, task: str, request: str) -> str:
    system = (
        f"You are a helpful assistant. Task type: {task}. "
        "Respond with the finished result only."
    )
    r = await client.post(
        OPENROUTER_URL,
        headers={
            "Authorization": f"Bearer {KEY}",
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "Prism Lab",
        },
        json={
            "model": model_id,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": request},
            ],
            "max_tokens": 1024,
        },
    )
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--judge", action="store_true", help="also add LLM-judge scores")
    parser.add_argument("--limit", type=int, default=0, help="only run the first N prompts")
    parser.add_argument(
        "--prompts",
        default=str(pathlib.Path(__file__).parent / "prompts.json"),
        help="path to the prompt set (e.g. lab/prompts_hard.json)",
    )
    parser.add_argument("--out", default=str(pathlib.Path(__file__).parent / "results.csv"))
    args = parser.parse_args()

    if not KEY:
        print("ERROR: OPENROUTER_API_KEY not found in .env at the project root.")
        sys.exit(1)

    if args.judge:
        os.environ["JUDGE_PROVIDER"] = "openrouter"

    prompts = json.loads((pathlib.Path(__file__).parent / "prompts.json").read_text())
    if args.limit:
        prompts = prompts[: args.limit]

    rows = []
    rid = 0
    async with httpx.AsyncClient(timeout=120) as client:
        for p in prompts:
            for m in MODELS:
                rid += 1
                label = f"[{rid}] {m['label']} · {p['task']}"
                try:
                    response = await generate(client, m["id"], p["task"], p["request"])
                except Exception as e:
                    print(f"  SKIP {label}: {e}")
                    continue

                heur = heuristic_scores(p["task"], p["request"], response)
                judge_overall = ""
                if args.judge:
                    axes = await judge_scores(p["task"], p["request"], response)
                    if axes:
                        judge_overall = overall_from_axes(axes)

                rows.append(
                    {
                        "id": rid,
                        "task": p["task"],
                        "model": m["label"],
                        "request": p["request"],
                        "response": response,
                        "heuristic_overall": heur["overall"],
                        "judge_overall": judge_overall,
                        "human_overall": "",  # ← you fill this in
                    }
                )
                extra = f" judge={judge_overall}" if args.judge else ""
                print(f"  OK   {label}  heuristic={heur['overall']}{extra}")

    fields = [
        "id", "task", "model", "request", "response",
        "heuristic_overall", "judge_overall", "human_overall",
    ]
    with open(args.out, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nWrote {len(rows)} rows → {args.out}")
    print("Next: open results.csv, fill the 'human_overall' column (0-100), save,")
    print("then run:  python lab/analyze.py")


if __name__ == "__main__":
    asyncio.run(main())
