from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services import embedder

router = APIRouter(prefix="/api", tags=["embed"])


class PairsIn(BaseModel):
    pairs: list[list[str]] = Field(min_length=1, max_length=6)


class SentencesIn(BaseModel):
    sentences: list[str] = Field(min_length=2, max_length=8)
    dims: int = Field(default=16, ge=8, le=64)


class ScatterInitIn(BaseModel):
    session_id: str = Field(min_length=1, max_length=64)
    sentences: list[str] = Field(min_length=3, max_length=12)


class ScatterAddIn(BaseModel):
    session_id: str = Field(min_length=1, max_length=64)
    sentence: str = Field(min_length=2, max_length=60)


@router.post("/similarity")
def similarity(body: PairsIn):
    return {"data": embedder.similarity_pairs(body.pairs)}


@router.post("/vectors")
def vectors(body: SentencesIn):
    return {"data": embedder.vector_bars(body.sentences, body.dims)}


@router.post("/scatter")
def scatter(body: SentencesIn):
    try:
        return {"data": embedder.scatter_2d(body.sentences)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/scatter/init")
def scatter_init(body: ScatterInitIn):
    """PCA 축을 세션에 고정한다. 이후 scatter/add 로 점을 추가할 수 있다."""
    try:
        return {"data": embedder.scatter_init(body.session_id, body.sentences)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/scatter/add")
def scatter_add(body: ScatterAddIn):
    """고정된 축에 새 문장 하나를 투영한다. 기존 점은 그대로다."""
    try:
        return {"data": embedder.scatter_add(body.session_id, body.sentence)}
    except KeyError as e:
        raise HTTPException(status_code=409, detail=str(e))