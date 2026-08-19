from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.matcher import match as run_match, ambiguity as run_ambiguity

router = APIRouter(prefix="/api", tags=["match"])


class MatchIn(BaseModel):
    utterance: str = Field(min_length=1, max_length=500)
    script: list[str] = Field(min_length=1, max_length=30)


class ScriptIn(BaseModel):
    script: list[str] = Field(min_length=1, max_length=30)


@router.post("/match")
def match(body: MatchIn):
    """발화가 대본 몇 번째 줄인지 판정한다."""
    return run_match(body.utterance, body.script)


@router.post("/ambiguity")
def ambiguity(body: ScriptIn):
    """대본 줄끼리 지나치게 비슷한 쌍을 찾는다."""
    return run_ambiguity(body.script)