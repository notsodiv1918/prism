#!/usr/bin/env python3
"""
Calibration analysis.

Reads one or more results CSVs (after you've filled the `human_overall` column)
and measures how well each automated score agrees with your human ratings:

  • Pearson r   — linear agreement (the headline number)
  • Spearman ρ  — rank agreement (do they order responses the same way?)
  • MAE         — average points apart on the 0-100 scale

It reports overall numbers, a per-task breakdown, per-model rankings, and saves
scatter plots for your README.

Usage:
    python lab/analyze.py                                   # results.csv
    python lab/analyze.py --csv lab/results_hard.csv        # the hard set
    python lab/analyze.py --csv lab/results.csv lab/results_hard.csv   # combined
"""

from __future__ import annotations

import argparse
import pathlib
import sys

import numpy as np
import pandas as pd

HERE = pathlib.Path(__file__).parent


def pearson(a: pd.Series, b: pd.Series) -> float:
    return float(np.corrcoef(a, b)[0, 1])


def spearman(a: pd.Series, b: pd.Series) -> float:
    return float(np.corrcoef(a.rank(), b.rank())[0, 1])


def mae(a: pd.Series, b: pd.Series) -> float:
    return float(np.mean(np.abs(a.to_numpy() - b.to_numpy())))


def line(name: str, human: pd.Series, auto: pd.Series, indent: str = "  ") -> None:
    mask = human.notna() & auto.notna()
    h, a = human[mask], auto[mask]
    n = len(h)
    if n < 3:
        print(f"{indent}{name}: too few rated rows (need >=3, have {n})")
        return
    # Guard against zero-variance columns (corrcoef returns nan).
    if h.nunique() < 2 or a.nunique() < 2:
        print(f"{indent}{name}: no variance to correlate (n={n}, MAE {mae(h, a):.1f})")
        return
    print(f"{indent}{name:<18} r={pearson(h, a):+.3f}  rho={spearman(h, a):+.3f}  MAE={mae(h, a):.1f}  (n={n})")


def scatter(human: pd.Series, auto: pd.Series, label: str, path: pathlib.Path) -> None:
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        return
    mask = human.notna() & auto.notna()
    if mask.sum() < 3 or human[mask].nunique() < 2 or auto[mask].nunique() < 2:
        return
    h, a = human[mask], auto[mask]
    fig, ax = plt.subplots(figsize=(4.5, 4.5))
    ax.scatter(h, a, s=36, alpha=0.75, color="#16161A")
    ax.plot([0, 100], [0, 100], "--", color="#C9C8C2", linewidth=1)
    ax.set_xlabel("Human rating")
    ax.set_ylabel(label)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.set_title(f"Human vs {label}\nr = {pearson(h, a):.2f}")
    fig.tight_layout()
    fig.savefig(path, dpi=130)
    print(f"  saved {path.name}")


def model_ranking(df: pd.DataFrame, indent: str = "  ") -> None:
    rated = df.dropna(subset=["human_overall"])
    if rated.empty:
        return
    means = (
        rated.groupby("model")["human_overall"]
        .agg(["mean", "count"])
        .sort_values("mean", ascending=False)
    )
    for model, row in means.iterrows():
        print(f"{indent}{model:<22} {row['mean']:.1f}  (n={int(row['count'])})")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", nargs="+", default=[str(HERE / "results.csv")])
    args = parser.parse_args()

    frames = []
    for path in args.csv:
        p = pathlib.Path(path)
        if not p.exists():
            print(f"Not found: {p}  (run run_batch.py first)")
            sys.exit(1)
        frames.append(pd.read_csv(p))
    df = pd.concat(frames, ignore_index=True)

    for col in ["heuristic_overall", "judge_overall", "human_overall"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    rated = int(df["human_overall"].notna().sum())
    print(f"Loaded {len(df)} rows from {len(args.csv)} file(s), {rated} with a human rating.")
    if rated == 0:
        print("\nFill the 'human_overall' column (0-100) in the CSV and rerun.")
        sys.exit(0)

    # Spread of the human ratings — a wider range = a more convincing test.
    hr = df["human_overall"].dropna()
    print(f"Human rating spread: min {hr.min():.0f}  max {hr.max():.0f}  std {hr.std():.1f}")

    print("\n=== OVERALL ===")
    line("Heuristic vs human", df["human_overall"], df["heuristic_overall"])
    has_judge = "judge_overall" in df.columns and df["judge_overall"].notna().any()
    if has_judge:
        line("Judge vs human", df["human_overall"], df["judge_overall"])
    else:
        print("  (no judge scores — rerun the batch with --judge to compare)")

    scatter(df["human_overall"], df["heuristic_overall"], "Heuristic score", HERE / "scatter_heuristic.png")
    if has_judge:
        scatter(df["human_overall"], df["judge_overall"], "Judge score", HERE / "scatter_judge.png")

    print("\n=== PER TASK ===")
    for task in sorted(df["task"].dropna().unique()):
        sub = df[df["task"] == task]
        n = int(sub["human_overall"].notna().sum())
        print(f"\n[{task}]  rated={n}")
        line("Heuristic vs human", sub["human_overall"], sub["heuristic_overall"], indent="    ")
        if has_judge:
            line("Judge vs human", sub["human_overall"], sub["judge_overall"], indent="    ")
        print("    model ranking:")
        model_ranking(sub, indent="      ")

    print("\n=== MODEL RANKING (all tasks) ===")
    model_ranking(df)


if __name__ == "__main__":
    main()
