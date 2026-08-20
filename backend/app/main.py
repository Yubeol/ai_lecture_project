import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import embed, generate, match, lectures
from app.services import embedder

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("app")

settings = get_settings()
app = FastAPI(title="Live Lecture Generator", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(embed.router)
app.include_router(generate.router)
app.include_router(match.router)
app.include_router(lectures.router)


@app.on_event("startup")
def on_startup():
    """ko-sroberta를 미리 로딩. 이걸 안 하면 첫 요청이 3초 더 걸린다."""
    log.info("임베딩 모델 로딩 중...")
    embedder.warmup()
    log.info("모델 준비 완료")


@app.get("/api/health")
def health():
    return {"status": "ok", "model": settings.embed_model}