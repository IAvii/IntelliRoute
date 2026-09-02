"""
Everything the notebook kept as separate globals (knowledge_base,
dept_faiss, sub_faiss, bm25_index, review_graph) lives on one State
object here, so main.py can hold a single instance and reset() it
cleanly instead of juggling `global` statements everywhere.
"""
import faiss
import networkx as nx

from . import config


class State:
    def __init__(self):
        self.knowledge_base = {
            dept: {
                "prototype": None,
                "all_embeddings": [],
                "sub_categories": {},
                # sub_categories[sub_cat] = {
                #   "description": str, "prototype": np.array,
                #   "reviews": [str], "count": int, "representatives": [str]
                # }
            }
            for dept in config.DEPARTMENTS
        }

        self.dept_faiss = faiss.IndexFlatIP(config.EMBEDDING_DIM)
        self.dept_names: list[str] = []
        self.sub_faiss = {d: faiss.IndexFlatIP(config.EMBEDDING_DIM) for d in config.DEPARTMENTS}
        self.sub_names = {d: [] for d in config.DEPARTMENTS}

        self.bm25_index = {}  # {"model": BM25Okapi, "depts": [...]}

        self.review_graph = nx.DiGraph()
        for dept in config.DEPARTMENTS:
            self.review_graph.add_node(dept, node_type="department", color=config.DEPT_COLORS[dept])

        self.bootstrapped = False


# One process-wide instance. FastAPI endpoints all read/write this.
state = State()
