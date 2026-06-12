from pydantic import BaseModel, Field


class EvaluateRequest(BaseModel):
    task: str = Field(..., description="Task type: general | coding | content | research | support")
    request: str = Field(..., description="The original user request")
    response: str = Field(..., description="The model's full response")


class EvalScores(BaseModel):
    relevance: float
    structure: float
    completeness: float
    overall: float
    judged_by: str
