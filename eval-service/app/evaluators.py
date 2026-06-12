"""
Response scoring.

Two layers, mirroring how a careful evaluation harness is actually built:

  • Heuristics (always on) — cheap, deterministic, transparent signals:
      relevance     : lexical overlap between the request and the response
      structure     : presence of the formatting the task calls for
      completeness   : whether the response has enough substance for the task
    These are intentionally simple and explainable. They are NOT ground truth —
    they are a fast baseline that is always available.

  • LLM-as-judge (optional) — if a judge key is configured, a model rates the
    response 0–100 on the same three axes. Its score is blended with the
    heuristic score (60% judge / 40% heuristic).

Why blend instead of trusting the judge outright: an LLM judge is itself noisy
and can be circular. Keeping a deterministic anchor and reporting `judged_by`
makes the number auditable. The README explains how to validate the judge
against a small human-labelled gold set — the step most projects skip.
"""

from __future__ import annotations

import json
import os
import re

import httpx

WORD_RE = re.compile(r"[a-zA-Z0-9']+")

STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "for", "with",
    "is", "are", "be", "this", "that", "it", "as", "at", "by", "from", "write",
    "make", "create", "give", "please", "can", "you", "i", "me", "my", "we",
}

# What "good structure" looks like per task, used as a light heuristic.
STRUCTURE_HINTS = {
    "coding": ("```",),
    "research": ("\n-", "\n*", "\n1.", "|", "##"),
    "content": ("\n\n",),
    "support": ("\n\n",),
    "general": ("",),
}


def _tokens(text: str) -> list[str]:
    return [w.lower() for w in WORD_RE.findall(text)]


def _content_words(text: str) -> set[str]:
    return {w for w in _tokens(text) if w not in STOPWORDS and len(w) > 2}


def relevance_score(request: str, response: str) -> float:
    """Share of the request's content words that appear in the response."""
    req = _content_words(request)
    if not req:
        return 70.0
    resp = set(_tokens(response))
    hit = sum(1 for w in req if w in resp)
    return round(min(100.0, 40.0 + 60.0 * (hit / len(req))), 1)


def structure_score(task: str, response: str) -> float:
    hints = STRUCTURE_HINTS.get(task, ("",))
    if hints == ("",):
        # Reward paragraphing / readability for unstructured tasks.
        return 80.0 if "\n\n" in response or len(response) < 600 else 65.0
    present = any(h and h in response for h in hints)
    base = 90.0 if present else 55.0
    if task == "coding" and "```" not in response:
        base = 40.0  # a coding answer with no code block is a real miss
    return round(base, 1)


def completeness_score(task: str, response: str) -> float:
    n = len(response.strip())
    floors = {"coding": 120, "research": 220, "content": 160, "support": 90, "general": 80}
    floor = floors.get(task, 80)
    if n == 0:
        return 0.0
    if n < floor:
        return round(45.0 * (n / floor), 1)
    # Adequate length earns a high score; absurdly long answers get a tiny penalty.
    score = 80.0 + min(15.0, (n - floor) / 80.0)
    if n > 6000:
        score -= 8.0
    return round(min(100.0, score), 1)


def heuristic_scores(task: str, request: str, response: str) -> dict[str, float]:
    rel = relevance_score(request, response)
    struc = structure_score(task, response)
    comp = completeness_score(task, response)
    overall = round(0.45 * rel + 0.2 * struc + 0.35 * comp, 1)
    return {"relevance": rel, "structure": struc, "completeness": comp, "overall": overall}


# ── Optional LLM-as-judge ────────────────────────────────────────────────────

JUDGE_PROMPT = (
    "You are evaluating an AI assistant's response. Score it 0-100 on three axes:\n"
    "- relevance: does it address the request?\n"
    "- structure: is it well-organised for this kind of task?\n"
    "- completeness: is it thorough enough, without padding?\n\n"
    "Task type: {task}\nRequest:\n{request}\n\nResponse:\n{response}\n\n"
    'Reply with ONLY compact JSON: {{"relevance":N,"structure":N,"completeness":N}}'
)


async def _judge_openai(task: str, request: str, response: str) -> dict[str, float] | None:
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        return None
    model = os.getenv("OPENAI_JUDGE_MODEL", "gpt-5.4-mini")
    prompt = JUDGE_PROMPT.format(task=task, request=request[:2000], response=response[:6000])
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}"},
            json={"model": model, "messages": [{"role": "user", "content": prompt}]},
        )
        r.raise_for_status()
        text = r.json()["choices"][0]["message"]["content"]
    return _parse_axes(text)


async def _judge_anthropic(task: str, request: str, response: str) -> dict[str, float] | None:
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        return None
    model = os.getenv("ANTHROPIC_JUDGE_MODEL", "claude-haiku-4-5-20251001")
    prompt = JUDGE_PROMPT.format(task=task, request=request[:2000], response=response[:6000])
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": key, "anthropic-version": "2023-06-01"},
            json={
                "model": model,
                "max_tokens": 100,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        r.raise_for_status()
        text = r.json()["content"][0]["text"]
    return _parse_axes(text)


async def _judge_openrouter(task: str, request: str, response: str) -> dict[str, float] | None:
    key = os.getenv("OPENROUTER_API_KEY")
    if not key:
        return None
    model = os.getenv("OPENROUTER_JUDGE_MODEL", "openai/gpt-oss-120b:free")
    prompt = JUDGE_PROMPT.format(task=task, request=request[:2000], response=response[:6000])
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}"},
            json={"model": model, "messages": [{"role": "user", "content": prompt}]},
        )
        r.raise_for_status()
        text = r.json()["choices"][0]["message"]["content"]
    return _parse_axes(text)


def _parse_axes(text: str) -> dict[str, float] | None:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
        return {
            "relevance": float(data["relevance"]),
            "structure": float(data["structure"]),
            "completeness": float(data["completeness"]),
        }
    except (json.JSONDecodeError, KeyError, ValueError, TypeError):
        return None


async def judge_scores(task: str, request: str, response: str) -> dict[str, float] | None:
    provider = (os.getenv("JUDGE_PROVIDER") or "").strip().lower()
    try:
        if provider == "openai":
            return await _judge_openai(task, request, response)
        if provider == "anthropic":
            return await _judge_anthropic(task, request, response)
        if provider == "openrouter":
            return await _judge_openrouter(task, request, response)
    except Exception:
        # Any judge failure → fall back to heuristics silently.
        return None
    return None


async def evaluate(task: str, request: str, response: str) -> dict[str, float | str]:
    heur = heuristic_scores(task, request, response)
    judged = await judge_scores(task, request, response)

    if judged is None:
        return {**heur, "judged_by": "heuristic"}

    # Blend: 60% judge, 40% heuristic on each axis.
    def blend(axis: str) -> float:
        return round(0.6 * judged[axis] + 0.4 * heur[axis], 1)

    rel, struc, comp = blend("relevance"), blend("structure"), blend("completeness")
    overall = round(0.45 * rel + 0.2 * struc + 0.35 * comp, 1)
    provider = (os.getenv("JUDGE_PROVIDER") or "llm").lower()
    return {
        "relevance": rel,
        "structure": struc,
        "completeness": comp,
        "overall": overall,
        "judged_by": provider,
    }
