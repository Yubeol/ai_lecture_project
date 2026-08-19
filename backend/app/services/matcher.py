"""대본 매칭. STT 결과를 대본 문장과 임베딩으로 비교해 가장 가까운 것을 찾는다.

STT는 조사나 어미를 자주 흘린다. 문자열 완전 일치로는 대본 모드가 성립하지 않아
임베딩 유사도로 매칭한다. 이 강의의 주제(코사인 유사도)를 시스템 자신이 쓰는 셈이다.
"""
from __future__ import annotations

import numpy as np

from app.services import embedder

# 이 값 미만이면 대본에 없는 발화로 본다.
# 0.65는 조사/어미가 흔들려도 붙고, 다른 주제는 걸러지는 선.
THRESHOLD = 0.65


def match(utterance: str, script: list[str]) -> dict:
    """발화를 대본과 대조한다.

    반환:
      {"index": int|None, "score": float, "scores": [float], "matched": bool}
    """
    if not script:
        return {"index": None, "score": 0.0, "scores": [], "matched": False}

    vecs = embedder.encode([utterance] + script)
    query, lines = vecs[0], vecs[1:]

    scores = [float(np.dot(query, v)) for v in lines]
    best = int(np.argmax(scores))
    top = scores[best]

    return {
        "index": best if top >= THRESHOLD else None,
        "score": round(top, 4),
        "scores": [round(s, 4) for s in scores],
        "matched": top >= THRESHOLD,
    }


def ambiguity(script: list[str], warn: float = 0.82) -> dict:
    """대본 줄끼리 너무 비슷하면 매칭이 헷갈린다. 미리 찾아준다."""
    if len(script) < 2:
        return {"pairs": []}

    vecs = embedder.encode(script)
    pairs = []
    for i in range(len(script)):
        for j in range(i + 1, len(script)):
            s = float(np.dot(vecs[i], vecs[j]))
            if s >= warn:
                pairs.append({"i": i, "j": j, "score": round(s, 4)})

    pairs.sort(key=lambda p: -p["score"])
    return {"pairs": pairs}