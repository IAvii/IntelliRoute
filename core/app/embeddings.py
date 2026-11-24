"""
Local ONNX embeddings + cross-encoder reranker + Groq LLM client.

The models used to be loaded through sentence-transformers, which drags in
PyTorch plus ~4.5 GB of CUDA wheels the app never uses. fastembed runs the
same weights as quantized ONNX, so the deploy bundle stays small and the
vectors still match what the notebook produced:

  - BAAI/bge-small-en-v1.5             -> 384-d bi-encoder (feature extraction)
  - Xenova/ms-marco-MiniLM-L-6-v2      -> cross-encoder query/passage logits

Weights are downloaded once into the fastembed cache (see config
FASTEMBED_CACHE_DIR); from then on startup is offline.
"""
import os
import threading

# Windows temp dirs don't support symlinks; huggingface_hub warns about it on
# every fresh cache. Cosmetic only, so silence it before fastembed is imported.
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

import numpy as np
from fastembed import TextEmbedding
from fastembed.rerank.cross_encoder import TextCrossEncoder
from groq import Groq

from . import config

_embedder = None
_reranker = None
_llm = None
_init_lock = threading.Lock()


def get_embedder() -> TextEmbedding:
    """Bi-encoder singleton. Loads the ONNX session on first use."""
    global _embedder
    if _embedder is None:
        with _init_lock:
            if _embedder is None:
                _embedder = TextEmbedding(
                    model_name=config.EMBEDDING_MODEL,
                    cache_dir=config.FASTEMBED_CACHE_DIR,
                )
    return _embedder


def get_reranker() -> TextCrossEncoder:
    """Lazy cross-encoder singleton. Only loads on first MID_ZONE rerank so
    the FastAPI /health endpoint stays instant."""
    global _reranker
    if _reranker is None:
        with _init_lock:
            if _reranker is None:
                _reranker = TextCrossEncoder(
                    model_name=config.CROSS_ENCODER_MODEL,
                    cache_dir=config.FASTEMBED_CACHE_DIR,
                )
    return _reranker


def get_llm_client():
    global _llm
    if _llm is None:
        _llm = Groq(api_key=config.GROQ_API_KEY)
    return _llm


def _as_matrix(vectors, expected_rows: int) -> np.ndarray:
    """Coerce fastembed output to an (n, 384) float32 L2-normalized matrix.

    fastembed already normalizes, but re-normalizing here keeps FAISS
    inner-product scores equal to cosine similarity regardless of the model
    file or a future normalization default change.
    """
    matrix = np.asarray(list(vectors), dtype=np.float32)
    if matrix.ndim == 1 and matrix.size:
        matrix = matrix.reshape(1, -1)
    if matrix.ndim != 2 or matrix.shape[1] != config.EMBEDDING_DIM:
        raise RuntimeError(
            "Unexpected embedding shape from fastembed: "
            f"{matrix.shape} (expected (*, {config.EMBEDDING_DIM}))"
        )
    if matrix.shape[0] != expected_rows:
        raise RuntimeError(
            f"fastembed returned {matrix.shape[0]} vectors for {expected_rows} inputs"
        )

    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    return matrix / np.where(norms == 0, 1.0, norms)


def embed(text: str) -> np.ndarray:
    return embed_batch([text])[0]


def embed_batch(texts: list[str]) -> np.ndarray:
    if not texts:
        return np.zeros((0, config.EMBEDDING_DIM), dtype=np.float32)
    texts = list(texts)
    return _as_matrix(get_embedder().embed(texts), len(texts))


def rerank_sub_categories(query: str, candidates: list[str]) -> list[float]:
    """Cross-encoder rerank of (query, sub_category_description) pairs.
    Returns softmax probabilities over the candidate set.

    ms-marco was trained as an absolute relevance model (logit = "how
    relevant is this doc?"), but for routing we need relative scores
    ("which of these clusters fits best?"). We softmax across the
    candidate set so the winner is well-defined even when every
    candidate has a strongly negative absolute logit.
    """
    if not candidates:
        return []

    candidates = list(candidates)
    scores = np.asarray(
        list(get_reranker().rerank(query, candidates)), dtype=np.float32
    )
    if scores.shape != (len(candidates),):
        raise RuntimeError(
            f"Reranker returned {scores.size} scores for {len(candidates)} candidates"
        )

    # Softmax across candidates — stable version.
    z = scores - np.max(scores)
    exp = np.exp(z)
    probs = exp / exp.sum()
    return [float(p) for p in probs]  # sum to 1.0


def call_llm(prompt: str) -> str:
    resp = get_llm_client().chat.completions.create(
        model=config.LLM_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        # groq==0.11.0 predates the typed `reasoning_effort` arg, so pass it
        # through extra_body (the API itself supports it on qwen3.x).
        extra_body={"reasoning_effort": "none"},
    )
    return resp.choices[0].message.content.strip()
