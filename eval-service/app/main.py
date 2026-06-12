"""
Prism evaluation service.

A small FastAPI app the gateway calls after each model finishes. It scores a
response on relevance, structure, and completeness. Runs heuristic-only by
default; add a judge key to blend in an LLM rating. See evaluators.py.

Run:
    uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.evaluators import evaluate
from app.schemas import EvaluateRequest, EvalScores

load_dotenv()

app = FastAPI(title="Prism Eval Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/evaluate", response_model=EvalScores)
async def evaluate_endpoint(body: EvaluateRequest) -> EvalScores:
    scores = await evaluate(body.task, body.request, body.response)
    return EvalScores(**scores)
