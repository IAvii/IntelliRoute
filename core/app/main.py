"""
FastAPI app exposing the classification pipeline to the frontend.

Endpoints:
  POST /api/bootstrap  -> builds the initial knowledge base (idempotent)
  POST /api/classify    -> {"review": "..."} -> full trace + highlight
  POST /api/classify_batch -> {"reviews": ["...", "..."]} or multipart file
                           -> per-review traces + aggregate counts
  GET  /api/graph        -> current knowledge graph as nodes/edges JSON
  GET  /api/stats        -> quick counts
  POST /api/reset        -> wipes state back to empty (re-bootstrap after)
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .bootstrap import run_bootstrap
from .graph_store import graph_to_json
from .pipeline import predict_traced, predict_batch
from .state import State, state

MAX_BATCH_REVIEWS = 500  # hard cap; one review can spawn multiple LLM calls

app = FastAPI(title="Zomato Review Classifier API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this before deploying publicly
    allow_methods=["*"],
    allow_headers=["*"],
)


class ClassifyRequest(BaseModel):
    review: str
    skip_split: bool = False


class ClassifyBatchRequest(BaseModel):
    reviews: list[str]
    skip_split: bool = False


@app.on_event("startup")
def _startup():
    run_bootstrap(state)


@app.post("/api/bootstrap")
def bootstrap_endpoint():
    run_bootstrap(state)
    return {"bootstrapped": state.bootstrapped, "graph": graph_to_json(state)}


@app.post("/api/classify")
def classify_endpoint(req: ClassifyRequest):
    if not req.review.strip():
        raise HTTPException(status_code=400, detail="review text is empty")
    result = predict_traced(state, req.review, skip_split=req.skip_split)
    result["graph"] = graph_to_json(state)
    return result


@app.post("/api/classify_batch")
def classify_batch_endpoint(req: ClassifyBatchRequest):
    reviews = [r for r in (s.strip() for s in req.reviews) if r]
    if not reviews:
        raise HTTPException(status_code=400, detail="no non-empty reviews provided")
    if len(reviews) > MAX_BATCH_REVIEWS:
        raise HTTPException(
            status_code=413,
            detail=f"too many reviews ({len(reviews)} > {MAX_BATCH_REVIEWS})",
        )

    results = predict_batch(state, reviews, skip_split=req.skip_split)
    return {
        "count": len(results),
        "results": results,
        "graph": graph_to_json(state),
    }


@app.get("/api/graph")
def graph_endpoint():
    return graph_to_json(state)


@app.get("/api/stats")
def stats_endpoint():
    return graph_to_json(state)["stats"]


@app.post("/api/reset")
def reset_endpoint():
    global state
    state = State()
    return {"reset": True}
