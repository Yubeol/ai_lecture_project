from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services import embedder

router = APIRouter(prefix="/api", tags=["embed"])


class PairsIn(BaseModel):
    pairs: list[list[str]] = Field(min_length=1, max_length=6)


class SentencesIn(BaseModel):
    sentences: list[str] = Field(min_length=2, max_length=8)
    dims: int = Field(default=32, ge=8, le=64)


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