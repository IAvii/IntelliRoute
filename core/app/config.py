
import os
from dotenv import load_dotenv

# Load .env from the backend/ directory regardless of where the server was launched.
# Without an explicit path, dotenv only searches the current working directory,
# which breaks when uvicorn is started from the project root.
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_BACKEND_DIR, ".env"))

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

# Confidence thresholds
HIGH_CONF = 0.85   # assign directly
LOW_CONF = 0.70    # middle zone -> pick best of top 3

# Cross-encoder reranker gates. The reranker fires whenever the
# bi-encoder top candidates are too close OR the absolute similarity
# is borderline. Then we trust the cross-encoder's rank-1 if it
# DISAGREES with the bi-encoder — that's the standard two-stage
# retrieval signal: when the bi-encoder is uncertain AND the two
# models rank differently, the cross-encoder almost always wins.
# Set to False to revert to bi-encoder-only behaviour.
RERANK_ENABLED = True
# Min bi-encoder margin to skip the rerank entirely (saves latency).
# When the top bi-encoder candidate wins by ≥ this much, it is
# trusted outright and the cross-encoder is not invoked at all.
RERANK_MARGIN_THRESHOLD = 0.05
# Softmax-probability threshold for the cross-encoder to override.
# rerank_sub_categories() softmaxes over the candidate set, so
# chance = 1 / len(candidates). 0.40 ≈ "the cross-encoder ranks
# this #1 with noticeably more confidence than uniform".
RERANK_OVERRIDE_PROB = 0.40

# Prototype update
OUTLIER_THRESHOLD = 0.65
EMA_ALPHA = 0.10
MAX_REPRESENTATIVES = 3

# Models
EMBEDDING_DIM = 384
EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"
# Cross-encoder reranker (loaded lazily). ~70MB, ~5–10ms per 3-candidate rerank.
CROSS_ENCODER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"
LLM_MODEL = "qwen/qwen3.8-27b"

# 5 fixed departments
DEPARTMENTS = [
    "Food",
    "Delivery",
    "Payment",
    "App & Tech",
    "Restaurant Experience",
]


INITIAL_REVIEWS = [
    "The biryani was completely stale and had a horrible smell.",
    "Delivery boy was asking for extra tip very rudely.",
    "Got charged twice for the same order on my credit card.",
    "The restaurant AC was blasting and food arrived ice cold.",
    "Paneer was completely raw and uncooked inside.",
    "App kept crashing every time I tried to add items to cart.",
    "The dal had a dead fly floating right on top.",
    "Waited 2 hours and food arrived completely cold and spilled.",
    "Received someone else entire order, nothing matched what I paid for.",
    "Waited 3 hours and the food never showed up at all.",
]
