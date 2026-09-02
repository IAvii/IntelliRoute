"""
BM25 + FAISS search and index rebuilds.
Direct port of notebook Cells 10, 14, 15.
"""
import numpy as np
from rank_bm25 import BM25Okapi

from . import config
from .state import State


def rebuild_faiss(s: State):
    s.dept_faiss.reset()
    s.dept_names.clear()
    for dept in config.DEPARTMENTS:
        proto = s.knowledge_base[dept]["prototype"]
        if proto is not None:
            s.dept_faiss.add(proto.reshape(1, -1))
            s.dept_names.append(dept)

    for dept in config.DEPARTMENTS:
        s.sub_faiss[dept].reset()
        s.sub_names[dept].clear()
        for sub_cat, data in s.knowledge_base[dept]["sub_categories"].items():
            s.sub_faiss[dept].add(data["prototype"].reshape(1, -1))
            s.sub_names[dept].append(sub_cat)


def rebuild_bm25(s: State):
    corpus, corpus_depts = [], []
    for dept in config.DEPARTMENTS:
        all_reviews = []
        for data in s.knowledge_base[dept]["sub_categories"].values():
            all_reviews.extend(data["reviews"])
        if all_reviews:
            corpus.append(" ".join(all_reviews).lower().split())
            corpus_depts.append(dept)

    s.bm25_index = {"model": BM25Okapi(corpus) if corpus else None, "depts": corpus_depts}


def bm25_top2(s: State, issue_text: str):
    """Returns (top2_depts, all_scores_dict) — mirrors bm25_search() but
    also returns full scores for the trace."""
    if not s.bm25_index.get("model"):
        return [], {}
    tokens = issue_text.lower().split()
    scores = s.bm25_index["model"].get_scores(tokens)
    depts = s.bm25_index["depts"]
    dept_scores = sorted(zip(depts, scores), key=lambda x: x[1], reverse=True)
    top2 = [d for d, sc in dept_scores[:2]]
    scores_dict = {d: round(float(sc), 3) for d, sc in dept_scores[:2]}
    return top2, scores_dict


def faiss_dept_search(s: State, emb: np.ndarray, candidate_depts: list[str]):
    """Returns (best_dept, best_sim, scores_dict) for the given candidates."""
    best_dept, best_sim = None, -1.0
    scores = {}
    for dept in candidate_depts:
        proto = s.knowledge_base[dept]["prototype"]
        if proto is None:
            continue
        sim = float(np.dot(proto, emb))
        scores[dept] = round(sim, 3)
        if sim > best_sim:
            best_sim, best_dept = sim, dept
    return best_dept, (best_sim if best_dept else None), scores


def faiss_sub_search(s: State, dept: str, emb: np.ndarray, top_k: int = 3):
    idx = s.sub_faiss[dept]
    if idx.ntotal == 0:
        return []
    k = min(top_k, idx.ntotal)
    D, I = idx.search(emb.reshape(1, -1), k=k)
    return [(s.sub_names[dept][int(i)], float(d)) for d, i in zip(D[0], I[0])]
