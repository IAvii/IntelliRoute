"""
Core classification pipeline. Direct port of notebook Cells 13, 16, 17,
18, 19 (extract_issues, build_classify_prompt, assign, update_prototype,
classify_issue -> here as classify_issue_traced which also returns a
structured trace dict for the frontend's inference-flow view).
"""
import json

import numpy as np

from . import config
from .embeddings import embed, embed_batch, call_llm, rerank_sub_categories
from .graph_store import graph_add_sub_category, graph_add_review
from .search import bm25_top2, faiss_dept_search, faiss_sub_search, rebuild_faiss, rebuild_bm25
from .state import State


def extract_issues(review: str) -> list[str]:

    prompt = f"""
You are a Zomato complaint issue extractor.

Review:
"{review}"

Task:
Extract the minimum number of INDEPENDENT business complaints.

Rules:
1. Split only when the review contains different problems that can be
   independently assigned to different complaint categories.
2. Do NOT split sentences just because they contain "and", "but",
   "because", or multiple clauses.
3. If two clauses describe the SAME incident/problem, keep them together.
4. Preserve the meaning and important context of each complaint.
5. Return exactly one item if there is only one business complaint.
6. Do not invent complaints.
7. Return ONLY a JSON array of strings.

Examples:

Review:
"Pizza was cold."
Output:
["Pizza was cold."]

Review:
"Food was stale and the delivery guy was rude."
Output:
["Food was stale.", "Delivery guy was rude."]

Review:
"The delivery took three hours and the food was completely cold."
Output:
["Delivery took three hours.", "Food was completely cold."]

Review:
"The restaurant claimed to be pet friendly but refused entry to my dog."
Output:
["The restaurant claimed to be pet friendly but refused entry to my dog."]

Review:
"The food was cold because the delivery was two hours late."
Output:
["Food was cold because the delivery was two hours late."]

Review:
"The app crashed, payment was deducted, and support never replied."
Output:
["The app crashed.", "Payment was deducted.", "Support never replied."]

Now process the review.

Return ONLY valid JSON.
"""

    raw = call_llm(prompt)

    return json.loads(raw)

def build_classify_prompt(s: State, issue_text: str) -> str:
    existing = ""
    for dept in config.DEPARTMENTS:
        subs = s.knowledge_base[dept]["sub_categories"]
        if not subs:
            continue
        existing += f"\n{dept}:"
        for sub_cat, data in subs.items():
            existing += f"\n  [{sub_cat}]: {data['description']}"
            if data["representatives"]:
                existing += "\n  Examples:"
                for rep in data["representatives"]:
                    existing += f"\n    - {rep}"

    return f"""You are a Zomato complaint classifier.

Fixed Departments: {', '.join(config.DEPARTMENTS)}

Existing sub-categories with examples:
{existing}

Complaint: "{issue_text}"

Rules:
1. Pick the best department.
2. Use an existing sub-category if it fits.
3. Create a new sub-category ONLY if nothing fits.

Return ONLY JSON:
{{"department": "Food", "sub_category": "Taste & Quality", "is_new": false}}

If new:
{{"department": "Food", "sub_category": "Portion Size", "is_new": true,
  "description": "Complaints about small or inadequate portions."}}

Return ONLY JSON. No explanation."""


def update_prototype(s: State, dept: str, sub_cat: str, new_emb: np.ndarray):
    sub = s.knowledge_base[dept]["sub_categories"][sub_cat]
    old_proto = sub["prototype"]

    sim = float(np.dot(old_proto, new_emb))
    if sim < config.OUTLIER_THRESHOLD:
        return  # outlier — skip update, matches notebook behavior

    weight = sim ** 2
    updated = (1 - config.EMA_ALPHA) * old_proto + config.EMA_ALPHA * new_emb * weight
    updated = updated / np.linalg.norm(updated)
    sub["prototype"] = updated

    vecs = embed_batch(sub["reviews"])
    sims = vecs @ updated
    top_k = min(config.MAX_REPRESENTATIVES, len(sub["reviews"]))
    top_i = np.argsort(sims)[::-1][:top_k]
    sub["representatives"] = [sub["reviews"][i] for i in top_i]

    all_embs = s.knowledge_base[dept]["all_embeddings"]
    if all_embs:
        dp = np.mean(all_embs, axis=0)
        s.knowledge_base[dept]["prototype"] = dp / np.linalg.norm(dp)


def assign(s: State, review: str, dept: str, sub_cat: str, emb: np.ndarray, description: str | None = None):
    is_new = sub_cat not in s.knowledge_base[dept]["sub_categories"]
    if is_new:
        s.knowledge_base[dept]["sub_categories"][sub_cat] = {
            "description": description or "",
            "prototype": emb.copy(),
            "reviews": [],
            "count": 0,
            "representatives": [],
        }

    sub = s.knowledge_base[dept]["sub_categories"][sub_cat]
    sub["reviews"].append(review)
    sub["count"] += 1
    s.knowledge_base[dept]["all_embeddings"].append(emb.copy())

    if not is_new:
        update_prototype(s, dept, sub_cat, emb)

    rebuild_faiss(s)
    rebuild_bm25(s)

    graph_add_sub_category(s, dept, sub_cat)
    review_node = graph_add_review(s, dept, sub_cat, review)

    return is_new, review_node


def classify_issue_traced(s: State, issue_text: str) -> dict:
    """
    Same pipeline as classify_issue() in the notebook, but every stage's
    scores/decision are recorded into a trace dict instead of only
    printed, so the frontend can render the live inference flow.
    """
    trace = {"query": issue_text, "stages": []}
    emb = embed(issue_text)

    # Stage 1 — BM25
    top2_depts, bm25_scores = bm25_top2(s, issue_text)
    trace["stages"].append({"stage": "BM25", "scores": bm25_scores, "top2": top2_depts})

    # Stage 2 — Dept FAISS
    best_dept, best_dept_sim, dept_scores = faiss_dept_search(s, emb, top2_depts)
    trace["stages"].append({
        "stage": "Dept FAISS", "scores": dept_scores,
        "winner": best_dept, "sim": best_dept_sim,
    })

    dept, sub_cat, assigned = None, None, False

    # Stage 3 — Sub FAISS + optional Cross-Encoder Rerank
    if best_dept:
        candidates = faiss_sub_search(s, best_dept, emb, top_k=3)
        if candidates:
            best_sub, best_sim = candidates[0]
            runner_up_sim = candidates[1][1] if len(candidates) > 1 else 0.0
            margin = best_sim - runner_up_sim
            decision = None
            if best_sim >= config.HIGH_CONF and margin >= config.RERANK_MARGIN_THRESHOLD:
                decision = "HIGH_CONF"
            elif best_sim >= config.LOW_CONF:
                decision = "MID_ZONE"

            trace["stages"].append({
                "stage": "Sub FAISS",
                "candidates": [(s_name, round(sc, 3)) for s_name, sc in candidates],
                "winner": best_sub, "sim": round(best_sim, 3),
                "decision": decision or "LOW_CONF",
                "margin": round(margin, 3),
            })

            # Stage 3b — Cross-encoder rerank. Fires whenever the bi-encoder
            # top candidates are too close to trust, OR the absolute similarity
            # is borderline. Description text (not raw embedding) goes
            # into the cross-encoder so it reads what the cluster actually
            # represents, not its centroid geometry.
            need_rerank = (
                config.RERANK_ENABLED
                and decision == "MID_ZONE"
                and len(candidates) >= 2
                and (
                    margin < config.RERANK_MARGIN_THRESHOLD * 3
                    or best_sim < (config.HIGH_CONF + config.LOW_CONF) / 2
                )
            )

            if need_rerank:
                descriptions = [
                    s.knowledge_base[best_dept]["sub_categories"][name].get(
                        "description", ""
                    ) or name
                    for name, _ in candidates
                ]
                probs = rerank_sub_categories(issue_text, descriptions)
                rerank_probs = list(
                    zip(
                        [n for n, _ in candidates],
                        [round(p, 3) for p in probs],
                    )
                )
                rerank_idx = int(np.argmax(probs))
                rerank_winner = candidates[rerank_idx][0]
                rerank_top_prob = probs[rerank_idx]

                # The two models disagree → trust the cross-encoder if its
                # rank-1 softmax probability clears the override floor and
                # is comfortably ahead of the runner-up. The disagreement
                # is the strongest signal — the cross-encoder reads the
                # text and recognises the difference between
                # "spicy/bad-tasting" and "cold/ice-cold".
                rerank_runner = sorted(probs, reverse=True)[1]
                override = (
                    rerank_winner != best_sub
                    and rerank_top_prob >= config.RERANK_OVERRIDE_PROB
                    and (rerank_top_prob - rerank_runner) >= 0.15
                )

                trace["stages"].append({
                    "stage": "Rerank",
                    "model": config.CROSS_ENCODER_MODEL,
                    "scores": rerank_probs,
                    "winner": rerank_winner,
                    "bi_encoder_winner": best_sub,
                    "overrode": bool(override),
                })

                if override:
                    best_sub = rerank_winner

            if decision:
                _, review_node = assign(s, issue_text, best_dept, best_sub, emb)
                dept, sub_cat, assigned = best_dept, best_sub, True

    # Stage 4 — LLM fallback
    if not assigned:
        trace["stages"].append({
            "stage": "LLM", "reason": "Low similarity at BM25/FAISS stages",
        })
        result = json.loads(call_llm(build_classify_prompt(s, issue_text)))
        dept = result["department"]
        sub_cat = result["sub_category"]
        desc = result.get("description")
        _, review_node = assign(s, issue_text, dept, sub_cat, emb, description=desc)

    trace["result"] = {
        "department": dept,
        "sub_category": sub_cat,
        "sub_category_node": f"{dept}::{sub_cat}",
        "review_node": review_node,
    }
    return trace


def predict_traced(s: State, review: str, skip_split: bool = False) -> dict:
    """
    Top-level entry point — mirrors visualize_inference() from the
    notebook. Splits into atomic issues (unless skip_split), classifies
    each one independently, and returns every trace + a combined
    highlight list for the graph view.
    """
    if skip_split:
        issues = [review]
    else:
        issues = extract_issues(review)

    traces = [classify_issue_traced(s, issue) for issue in issues]

    highlight = [
        {
            "department": t["result"]["department"],
            "sub_category": t["result"]["sub_category"],
            "sub_category_node": t["result"]["sub_category_node"],
            "review_node": t["result"]["review_node"],
        }
        for t in traces
    ]

    return {"review": review, "issues": issues, "traces": traces, "highlight": highlight}


def predict_batch(s: State, reviews: list[str], skip_split: bool = False) -> list[dict]:
    """
    Sequential per-review classification using the same pipeline as
    predict_traced(). One review at a time so the knowledge base,
    prototypes, and graph stay consistent with the single-review path
    (each call to assign() updates embeddings and graph nodes exactly
    the way predict_traced() does).

    Returns a list parallel to `reviews`, each entry:
      {"review": str, "issues": [...], "traces": [...],
       "highlight": [...], "error": str|None}
    `error` is set (and `traces` may be empty) if a single review fails
    so the loop can keep going instead of aborting the whole batch.
    """
    out: list[dict] = []
    for i, review in enumerate(reviews):
        try:
            result = predict_traced(s, review, skip_split=skip_split)
            result["error"] = None
            out.append(result)
        except Exception as e:  # noqa: BLE001 — log and continue
            out.append(
                {
                    "review": review,
                    "issues": [],
                    "traces": [],
                    "highlight": [],
                    "error": f"{type(e).__name__}: {e}",
                    "index": i,
                }
            )
    return out
