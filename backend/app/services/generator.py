"""발화 → Claude JSON → 임베딩 실측값 결합 → 최종 payload."""
from __future__ import annotations

import json
import logging
import re
import time

from anthropic import Anthropic

from app.config import get_settings
from app.schemas.components import validate_payload
from app.services import embedder
from app.services.prompts import SYSTEM_PROMPT, USER_TEMPLATE

log = logging.getLogger(__name__)
settings = get_settings()
client = Anthropic(api_key=settings.anthropic_api_key)


# ---------- JSON 추출 ----------

def extract_json(raw: str) -> dict | None:
    """백틱/서두가 섞여도 첫 완전한 JSON 객체를 뽑아낸다.
    prompt-lab 검증에서 오염 0/66이었지만 방어는 유지한다."""
    text = raw.strip()

    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    depth, start, in_str, esc = 0, None, False, False
    for i, ch in enumerate(text):
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start is not None:
                try:
                    return json.loads(text[start:i + 1])
                except json.JSONDecodeError:
                    return None
    return None


# ---------- 임베딩 결합 ----------

def enrich(payload: dict) -> dict:
    """Claude가 정한 문장들에 ko-sroberta 실측값을 붙인다.
    숫자는 전부 여기서 만들어진다. LLM이 만든 숫자는 없다."""
    name = payload["component"]

    if name == "SimilarityGauge":
        payload["data"] = embedder.similarity_pairs(payload["pairs"])

    elif name == "VectorBars":
        payload["data"] = embedder.vector_bars(
            payload["sentences"], payload.get("dims", 32)
        )

    elif name == "Scatter2D":
        payload["data"] = embedder.scatter_2d(payload["sentences"])

    elif name == "ThresholdSim":
        payload["data"] = embedder.threshold_pairs(payload["pairs"])

    elif name == "CosineAngle":
        payload["data"] = [
            embedder.cosine_angle(p[0], p[1]) for p in payload["pairs"]
        ]

    return payload


# ---------- 메인 ----------

def generate(utterance: str) -> dict:
    """발화 하나를 완성된 렌더 payload로.

    반환 형태:
      성공 → {"ok": True,  "payload": {...}, "timing": {...}}
      무시 → {"ok": False, "skip": True,  "reason": "..."}   (none 또는 실패)
    """
    t0 = time.perf_counter()

    try:
        resp = client.messages.create(
            model=settings.claude_model,
            max_tokens=settings.max_tokens,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user",
                       "content": USER_TEMPLATE.format(utterance=utterance)}],
        )
    except Exception as e:
        log.warning("Claude 호출 실패: %s", e)
        return {"ok": False, "skip": True, "reason": f"api_error: {e}"}

    t_llm = time.perf_counter() - t0
    raw = "".join(b.text for b in resp.content if b.type == "text")

    obj = extract_json(raw)
    if obj is None:
        log.warning("JSON 파싱 실패: %s", raw[:200])
        return {"ok": False, "skip": True, "reason": "parse_failed"}

    valid, msg, name = validate_payload(obj)
    if not valid:
        log.warning("스키마 위반(%s): %s", name, msg)
        return {"ok": False, "skip": True, "reason": f"invalid: {msg}"}

    if name == "none":
        return {"ok": False, "skip": True,
                "reason": obj.get("reason", "no_visual")}

    t1 = time.perf_counter()
    try:
        payload = enrich(obj)
    except Exception as e:
        log.warning("임베딩 계산 실패: %s", e)
        return {"ok": False, "skip": True, "reason": f"embed_error: {e}"}

    t_embed = time.perf_counter() - t1

    return {
        "ok": True,
        "payload": payload,
        "timing": {
            "llm": round(t_llm, 3),
            "embed": round(t_embed, 3),
            "total": round(time.perf_counter() - t0, 3),
        },
    }