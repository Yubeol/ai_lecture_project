python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('jhgan/ko-sbert-nli')"

uvicorn app.main:app --reload --port 8000