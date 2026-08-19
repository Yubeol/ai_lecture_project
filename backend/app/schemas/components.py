"""컴포넌트별 JSON 스키마. 프론트 props와 1:1로 맞춘다.
검증 끝나면 backend/app/schemas/components.py 로 그대로 이식."""
from typing import Literal, List
from pydantic import BaseModel, Field, field_validator, ConfigDict


class Base(BaseModel):
    # 스키마에 없는 필드가 오면 에러. LLM이 score 같은 걸 지어내는 걸 막는다.
    model_config = ConfigDict(extra="forbid")


def _check_sentence(s: str) -> str:
    s = s.strip()
    if not (2 <= len(s) <= 60):
        raise ValueError(f"문장 길이 이상({len(s)}자): {s!r}")
    return s


class SimilarityGauge(Base):
    component: Literal["SimilarityGauge"]
    title: str = Field(min_length=1, max_length=40)
    pairs: List[List[str]] = Field(min_length=1, max_length=4)
    caption: str = Field(min_length=1, max_length=120)

    @field_validator("pairs")
    @classmethod
    def v_pairs(cls, v):
        for p in v:
            if len(p) != 2:
                raise ValueError(f"pair는 문장 2개여야 함 (got {len(p)})")
            a, b = _check_sentence(p[0]), _check_sentence(p[1])
            if a == b:
                raise ValueError("동일한 문장 쌍")
        return v


class VectorBars(Base):
    component: Literal["VectorBars"]
    title: str = Field(min_length=1, max_length=40)
    sentences: List[str] = Field(min_length=2, max_length=4)
    dims: int = Field(default=16, ge=8, le=64)
    caption: str = Field(min_length=1, max_length=120)

    @field_validator("sentences")
    @classmethod
    def v_sentences(cls, v):
        cleaned = [_check_sentence(s) for s in v]
        if len(set(cleaned)) != len(cleaned):
            raise ValueError("중복 문장")
        return cleaned


class Scatter2D(Base):
    component: Literal["Scatter2D"]
    title: str = Field(min_length=1, max_length=40)
    sentences: List[str] = Field(min_length=4, max_length=6)
    caption: str = Field(min_length=1, max_length=120)

    @field_validator("sentences")
    @classmethod
    def v_sentences(cls, v):
        cleaned = [_check_sentence(s) for s in v]
        if len(set(cleaned)) != len(cleaned):
            raise ValueError("중복 문장")
        return cleaned


class ThresholdSim(Base):
    component: Literal["ThresholdSim"]
    title: str = Field(min_length=1, max_length=40)
    pairs: List[List[str]] = Field(min_length=2, max_length=6)
    default_threshold: float = Field(default=0.6, ge=0.0, le=1.0)
    caption: str = Field(min_length=1, max_length=120)

    @field_validator("pairs")
    @classmethod
    def v_pairs(cls, v):
        for p in v:
            if len(p) != 2:
                raise ValueError(f"pair는 문장 2개여야 함 (got {len(p)})")
            _check_sentence(p[0])
            _check_sentence(p[1])
        return v

class KeyPoints(Base):
    """개념 설명용. 도입·정의·요약 구간에 쓴다.
    수치가 없으므로 embedder를 거치지 않는다."""
    component: Literal["KeyPoints"]
    title: str = Field(min_length=1, max_length=40)
    points: List[str] = Field(min_length=2, max_length=4)
    caption: str = Field(default="", max_length=120)

    @field_validator("points")
    @classmethod
    def v_points(cls, v):
        cleaned = []
        for s in v:
            s = s.strip()
            if not (4 <= len(s) <= 50):
                raise ValueError(f"항목 길이 이상({len(s)}자): {s!r}")
            cleaned.append(s)
        if len(set(cleaned)) != len(cleaned):
            raise ValueError("중복 항목")
        return cleaned


class NoOp(Base):
    """생성할 게 없을 때. 잡담/오인식 방어용."""
    component: Literal["none"]
    reason: str = Field(default="", max_length=80)


REGISTRY = {
    "SimilarityGauge": SimilarityGauge,
    "VectorBars": VectorBars,
    "Scatter2D": Scatter2D,
    "ThresholdSim": ThresholdSim,
    "KeyPoints": KeyPoints,
    "none": NoOp,
}

def validate_payload(obj) -> tuple[bool, str, str | None]:
    """(성공여부, 메시지, 컴포넌트명)"""
    if not isinstance(obj, dict):
        return False, f"dict 아님: {type(obj).__name__}", None
    name = obj.get("component")
    if name not in REGISTRY:
        return False, f"미등록 component: {name!r}", None
    try:
        REGISTRY[name].model_validate(obj)
        return True, "ok", name
    except Exception as e:
        lines = [l.strip() for l in str(e).splitlines() if l.strip()]
        detail = lines[1] if len(lines) > 1 else lines[0]
        return False, f"스키마 위반: {detail}", name