from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.generator import generate as run_generate

router = APIRouter(prefix="/api", tags=["generate"])


class GenerateIn(BaseModel):
    utterance: str = Field(min_length=1, max_length=500)


@router.post("/generate")
def generate(body: GenerateIn):
    """발화 → 완성된 렌더 payload.
    실패/none은 200 + skip:true 로 내려간다. 프론트가 조용히 무시하면 된다."""
    return run_generate(body.utterance)