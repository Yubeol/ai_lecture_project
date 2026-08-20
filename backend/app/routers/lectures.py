from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.lecture import Lecture, LectureSession, SessionLog, Utterance

router = APIRouter(prefix="/api/lectures", tags=["lectures"])


# ---------- 스키마 ----------

class UtteranceIn(BaseModel):
    text: str = Field(min_length=1, max_length=300)
    note: str | None = None


class LectureIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    topic: str | None = Field(default=None, max_length=60)
    utterances: list[UtteranceIn] = Field(min_length=1, max_length=50)


class LogIn(BaseModel):
    session_id: int
    heard: str
    matched_seq: int | None = None
    match_score: float | None = None
    component: str | None = None
    payload: dict | None = None
    source: str | None = None
    llm_ms: int | None = None
    embed_ms: int | None = None


def to_dict(lec: Lecture) -> dict:
    return {
        "id": lec.id,
        "title": lec.title,
        "topic": lec.topic,
        "created_at": lec.created_at.isoformat(),
        "utterances": [
            {"seq": u.seq, "text": u.text, "note": u.note} for u in lec.utterances
        ],
    }


# ---------- 강의 ----------

@router.get("")
def list_lectures(db: Session = Depends(get_db)):
    """목록. 인트로 화면에서 고를 수 있게 요약만 준다."""
    rows = db.scalars(select(Lecture).order_by(Lecture.updated_at.desc())).all()
    return {
        "data": [
            {
                "id": l.id,
                "title": l.title,
                "topic": l.topic,
                "count": len(l.utterances),
                "updated_at": l.updated_at.isoformat(),
            }
            for l in rows
        ]
    }


@router.get("/{lecture_id}")
def get_lecture(lecture_id: int, db: Session = Depends(get_db)):
    lec = db.get(Lecture, lecture_id)
    if not lec:
        raise HTTPException(404, "강의 없음")
    return {"data": to_dict(lec)}


@router.post("")
def create_lecture(body: LectureIn, db: Session = Depends(get_db)):
    lec = Lecture(title=body.title, topic=body.topic)
    lec.utterances = [
        Utterance(seq=i, text=u.text, note=u.note)
        for i, u in enumerate(body.utterances)
    ]
    db.add(lec)
    db.commit()
    return {"data": to_dict(lec)}


@router.put("/{lecture_id}")
def update_lecture(lecture_id: int, body: LectureIn, db: Session = Depends(get_db)):
    lec = db.get(Lecture, lecture_id)
    if not lec:
        raise HTTPException(404, "강의 없음")

    lec.title = body.title
    lec.topic = body.topic
    # 순서가 바뀌면 매칭이 어긋나므로 통째로 교체한다
    lec.utterances = [
        Utterance(seq=i, text=u.text, note=u.note)
        for i, u in enumerate(body.utterances)
    ]
    db.commit()
    return {"data": to_dict(lec)}


@router.delete("/{lecture_id}")
def delete_lecture(lecture_id: int, db: Session = Depends(get_db)):
    lec = db.get(Lecture, lecture_id)
    if not lec:
        raise HTTPException(404, "강의 없음")
    db.delete(lec)
    db.commit()
    return {"ok": True}


# ---------- 실행 기록 ----------

@router.post("/{lecture_id}/sessions")
def start_session(lecture_id: int, db: Session = Depends(get_db)):
    s = LectureSession(lecture_id=lecture_id)
    db.add(s)
    db.commit()
    return {"data": {"session_id": s.id}}


@router.post("/logs")
def add_log(body: LogIn, db: Session = Depends(get_db)):
    """발화 하나의 처리 결과를 남긴다. 실패해도 강의는 계속되어야 하므로
    프론트는 이 호출의 결과를 기다리지 않는다."""
    db.add(SessionLog(**body.model_dump()))
    db.commit()
    return {"ok": True}


@router.get("/{lecture_id}/logs")
def get_logs(lecture_id: int, db: Session = Depends(get_db)):
    """강의별 실행 기록. 어떤 발화에서 매칭이 약했는지 보인다."""
    rows = db.scalars(
        select(SessionLog)
        .join(LectureSession, SessionLog.session_id == LectureSession.id)
        .where(LectureSession.lecture_id == lecture_id)
        .order_by(SessionLog.created_at.desc())
        .limit(200)
    ).all()
    return {
        "data": [
            {
                "heard": r.heard,
                "matched_seq": r.matched_seq,
                "match_score": r.match_score,
                "component": r.component,
                "source": r.source,
                "llm_ms": r.llm_ms,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ]
    }