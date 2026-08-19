"""ko-sbert 싱글톤. 모델 로딩은 프로세스당 1회."""
from __future__ import annotations

import threading
from functools import lru_cache

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.decomposition import PCA

MODEL_NAME = "jhgan/ko-sroberta-multitask"
DIM = 768

_model: SentenceTransformer | None = None
_lock = threading.Lock()


def get_model() -> SentenceTransformer:
    """지연 로딩 + 스레드 안전. FastAPI 워커가 동시에 때려도 1회만 로딩."""
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                _model = SentenceTransformer(MODEL_NAME)
    return _model


def warmup() -> None:
    """서버 기동 시 미리 로딩. 첫 요청이 30초 걸리는 걸 막는다."""
    m = get_model()
    m.encode(["워밍업 문장"], convert_to_numpy=True)


@lru_cache(maxsize=512)
def _encode_one(text: str) -> tuple[float, ...]:
    """문장 단위 캐시. 같은 예시 문장이 반복 등장하므로 효과가 크다.
    lru_cache는 해시 가능한 반환값이 필요해 tuple로 저장한다."""
    vec = get_model().encode([text], convert_to_numpy=True,
                             normalize_embeddings=True)[0]
    return tuple(float(x) for x in vec)


def encode(texts: list[str]) -> np.ndarray:
    """(N, 768) 정규화된 벡터. 캐시 미스만 모델에 태운다."""
    return np.array([_encode_one(t.strip()) for t in texts], dtype=np.float32)


def cosine(a: str, b: str) -> float:
    """정규화되어 있으므로 내적이 곧 코사인 유사도."""
    v = encode([a, b])
    return float(np.dot(v[0], v[1]))


def similarity_pairs(pairs: list[list[str]]) -> list[dict]:
    """SimilarityGauge용.
    score  = 실제 코사인 값 (-1~1). 화면에 숫자로 표시.
    gauge  = 게이지 채움 비율 (0~1). 음수는 0으로 클리핑."""
    out = []
    for p in pairs:
        score = cosine(p[0], p[1])
        out.append({
            "a": p[0],
            "b": p[1],
            "score": round(score, 4),
            "gauge": round(max(0.0, min(1.0, score)), 4),
        })
    return out


def vector_bars(sentences: list[str], dims: int = 32) -> list[dict]:
    """VectorBars용. 앞 N차원만 잘라서 반환.
    정규화 벡터라 값이 ±0.05 범위로 작다. 프론트에서 스케일링할 수 있도록
    절대 최대값을 함께 넘긴다."""
    vecs = encode(sentences)
    sliced = vecs[:, :dims]
    vmax = float(np.abs(sliced).max()) or 1.0
    return [
        {"sentence": s, "values": [round(float(x), 6) for x in row], "vmax": vmax}
        for s, row in zip(sentences, sliced)
    ]


def scatter_2d(sentences: list[str]) -> list[dict]:
    """Scatter2D용. PCA로 2차원 투영 후 [-1,1] 정규화.
    t-SNE가 아니라 PCA인 이유: 실시간으로 점을 추가해도 좌표계가 유지된다."""
    if len(sentences) < 3:
        raise ValueError("Scatter2D는 문장 3개 이상 필요")
    vecs = encode(sentences)
    coords = PCA(n_components=2, random_state=42).fit_transform(vecs)

    span = np.abs(coords).max() or 1.0
    coords = coords / span

    return [
        {"sentence": s, "x": round(float(c[0]), 4), "y": round(float(c[1]), 4)}
        for s, c in zip(sentences, coords)
    ]


def threshold_pairs(pairs: list[list[str]]) -> list[dict]:
    """ThresholdSim용. 구조는 similarity_pairs와 같지만
    프론트에서 슬라이더로 판정선을 움직인다."""
    return similarity_pairs(pairs)

# ---------- Scatter2D 세션 ----------
# 점을 나중에 추가하려면 PCA 축이 고정되어야 한다.
# t-SNE가 아니라 PCA를 고른 이유가 이것이다: fit 한 번, transform 여러 번.

_scatter_sessions: dict[str, dict] = {}


def scatter_init(session_id: str, sentences: list[str]) -> list[dict]:
    """첫 문장 세트로 PCA를 학습하고 좌표를 만든다. 축을 세션에 보관한다."""
    if len(sentences) < 3:
        raise ValueError("Scatter2D는 문장 3개 이상 필요")

    vecs = encode(sentences)
    pca = PCA(n_components=2, random_state=42).fit(vecs)
    coords = pca.transform(vecs)

    span = float(np.abs(coords).max()) or 1.0

    _scatter_sessions[session_id] = {
        "pca": pca,
        "span": span,
        "sentences": list(sentences),
    }

    return [
        {"sentence": s, "x": round(float(c[0] / span), 4),
         "y": round(float(c[1] / span), 4), "added": False}
        for s, c in zip(sentences, coords)
    ]


def scatter_add(session_id: str, sentence: str) -> dict:
    """기존 축 그대로 새 문장 하나를 투영한다. 기존 점은 움직이지 않는다."""
    sess = _scatter_sessions.get(session_id)
    if sess is None:
        raise KeyError("세션 없음. 먼저 scatter_init 을 호출해야 한다")

    vec = encode([sentence])
    c = sess["pca"].transform(vec)[0]
    span = sess["span"]

    # 새 점이 축 범위를 벗어나면 화면 밖으로 나간다. 가장자리에 붙여 둔다.
    x = max(-1.0, min(1.0, float(c[0] / span)))
    y = max(-1.0, min(1.0, float(c[1] / span)))

    sess["sentences"].append(sentence)

    # 가장 가까운 기존 문장도 함께 알려준다. "어디에 붙었는지"를 말할 수 있게.
    all_vecs = encode(sess["sentences"][:-1])
    sims = [float(np.dot(vec[0], v)) for v in all_vecs]
    best = int(np.argmax(sims))

    return {
        "sentence": sentence,
        "x": round(x, 4),
        "y": round(y, 4),
        "added": True,
        "nearest": sess["sentences"][best],
        "nearest_score": round(sims[best], 4),
    }


def scatter_clear(session_id: str) -> None:
    _scatter_sessions.pop(session_id, None)