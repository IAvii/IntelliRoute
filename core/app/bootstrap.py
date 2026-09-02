"""
Bootstrap the knowledge base from the 10 seed reviews with a single
LLM call. Port of notebook Cells 6-9 (build_bootstrap_prompt,
rebuild_prototypes, rebuild_faiss, rebuild_bm25, graph init).
"""
import json

import numpy as np

from . import config
from .embeddings import call_llm, embed_batch
from .graph_store import graph_add_review, graph_add_sub_category
from .search import rebuild_bm25, rebuild_faiss
from .state import State


def build_bootstrap_prompt(reviews: list[str]) -> str:
    numbered = "\n".join(f"{i + 1}. {r}" for i, r in enumerate(reviews))
    depts = ", ".join(config.DEPARTMENTS)
    return f"""You are a Zomato complaint classifier.

Fixed Departments (use ONLY these): {depts}

Reviews:
{numbered}

Instructions:
1. Each review may have ONE or MULTIPLE complaints.
2. For each complaint assign: department + sub_category + description.
3. Sub-category must be short (2-4 words).
4. Use ONLY the fixed departments listed above.

Return ONLY a JSON array:
[
  {{
    "review_index": 1,
    "issues": [
      {{"department": "Food", "sub_category": "Taste & Quality",
        "description": "Complaints about stale or bad tasting food."}}
    ]
  }}
]
Return ONLY JSON. No explanation."""


def rebuild_prototypes(s: State):
    for dept in config.DEPARTMENTS:
        for sub_cat, data in s.knowledge_base[dept]["sub_categories"].items():
            vecs = embed_batch(data["reviews"])
            proto = vecs.mean(axis=0)
            proto = proto / np.linalg.norm(proto)
            data["prototype"] = proto

            sims = vecs @ proto
            top_k = min(config.MAX_REPRESENTATIVES, len(data["reviews"]))
            top_i = np.argsort(sims)[::-1][:top_k]
            data["representatives"] = [data["reviews"][i] for i in top_i]

        all_embs = s.knowledge_base[dept]["all_embeddings"]
        if all_embs:
            dp = np.mean(all_embs, axis=0)
            s.knowledge_base[dept]["prototype"] = dp / np.linalg.norm(dp)


def run_bootstrap(s: State):
    if s.bootstrapped:
        return

    reviews = config.INITIAL_REVIEWS
    prompt = build_bootstrap_prompt(reviews)
    raw = call_llm(prompt)
    bootstrap_data = json.loads(raw)

    embeddings = embed_batch(reviews)

    for item in bootstrap_data:
        idx = item["review_index"] - 1
        review = reviews[idx]
        emb = embeddings[idx]

        for issue in item["issues"]:
            dept = issue["department"]
            sub_cat = issue["sub_category"]
            desc = issue["description"]

            s.knowledge_base[dept]["all_embeddings"].append(emb.copy())

            if sub_cat not in s.knowledge_base[dept]["sub_categories"]:
                s.knowledge_base[dept]["sub_categories"][sub_cat] = {
                    "description": desc,
                    "prototype": emb.copy(),
                    "reviews": [],
                    "count": 0,
                    "representatives": [],
                }

            sub = s.knowledge_base[dept]["sub_categories"][sub_cat]
            sub["reviews"].append(review)
            sub["count"] += 1

    rebuild_prototypes(s)
    rebuild_faiss(s)
    rebuild_bm25(s)

    for item in bootstrap_data:
        idx = item["review_index"] - 1
        review = reviews[idx]
        for issue in item["issues"]:
            dept, sub_cat = issue["department"], issue["sub_category"]
            graph_add_sub_category(s, dept, sub_cat)
            graph_add_review(s, dept, sub_cat, review)

    s.bootstrapped = True
