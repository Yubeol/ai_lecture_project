-- pgvector 확장. 임베딩 캐시에 필요하다.
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------- 강의 (테마별) ----------
CREATE TABLE IF NOT EXISTS lectures (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(120) NOT NULL,
    topic       VARCHAR(60),                 -- 임베딩 / 머신러닝 / ...
    mode        VARCHAR(16) NOT NULL DEFAULT 'script',   -- script | free
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- 대본 한 줄 ----------
CREATE TABLE IF NOT EXISTS utterances (
    id          SERIAL PRIMARY KEY,
    lecture_id  INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    seq         INTEGER NOT NULL,            -- 강의 내 순서
    text        TEXT NOT NULL,
    note        TEXT,                        -- 발표자 노트 (화면에 안 뜸)
    UNIQUE (lecture_id, seq)
);

-- ---------- 강의 실행 기록 ----------
-- 어떤 발화에 무엇이 떴는지. 오인식 분석과 프롬프트 개선의 근거가 된다.
CREATE TABLE IF NOT EXISTS sessions (
    id          SERIAL PRIMARY KEY,
    lecture_id  INTEGER REFERENCES lectures(id) ON DELETE SET NULL,
    started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS session_logs (
    id            BIGSERIAL PRIMARY KEY,
    session_id    INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    heard         TEXT NOT NULL,             -- STT 원문
    matched_seq   INTEGER,                   -- 매칭된 대본 순서 (없으면 NULL)
    match_score   REAL,
    component     VARCHAR(40),
    payload       JSONB,
    source        VARCHAR(16),               -- realtime | prefetch | cache
    llm_ms        INTEGER,
    embed_ms      INTEGER,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logs_session ON session_logs(session_id);

-- ---------- 임베딩 캐시 ----------
-- lru_cache 는 프로세스가 죽으면 사라진다. 영구 캐시로 보완한다.
CREATE TABLE IF NOT EXISTS embedding_cache (
    sentence    TEXT PRIMARY KEY,
    vec         vector(768) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 코사인 거리 인덱스. 문장이 쌓이면 유사 문장 검색에 쓴다.
CREATE INDEX IF NOT EXISTS idx_embed_vec
    ON embedding_cache USING ivfflat (vec vector_cosine_ops) WITH (lists = 100);