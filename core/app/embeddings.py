"""
Embedding model + cross-encoder reranker + Groq LLM client.
Same as notebook Cell 4 + a reranker added for the MID_ZONE branch.
Loaded once at process start (module-level singletons).
"""
import numpy as np
from sentence_transformers import SentenceTransformer, CrossEncoder
from groq import Groq

from . import config

_embedder = None
_reranker = None
_client = None


def get_embedder():
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer(config.EMBEDDING_MODEL)
    return _embedder


def get_reranker():
    """Lazy cross-encoder singleton. Only loads on first MID_ZONE rerank so
    the FASTAPI /health endpoint stays instant."""
    global _reranker
    if _reranker is None:
        _reranker = CrossEncoder(config.CROSS_ENCODER_MODEL)
    return _reranker


def get_llm_client():
    global _client
    if _client is None:
        _client = Groq(api_key=config.GROQ_API_KEY)
    return _client


def embed(text: str) -> np.ndarray:
    return get_embedder().encode(
        text, normalize_embeddings=True, convert_to_numpy=True
    ).astype("float32")


def embed_batch(texts: list[str]) -> np.ndarray:
    return get_embedder().encode(
        texts, normalize_embeddings=True, convert_to_numpy=True
    ).astype("float32")


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
    model = get_reranker()
    pairs = [(query, c) for c in candidates]
    scores = model.predict(pairs, convert_to_numpy=True)
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
        reasoning_effort="none"
    )
    return resp.choices[0].message.content.strip()
