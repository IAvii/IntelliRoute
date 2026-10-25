"""
Graph mutation (port of notebook Cell 9) + serialization to plain
JSON the frontend can lay out and render on the client side.
"""
import numpy as np

from . import config
from .state import State


def graph_add_sub_category(s: State, dept: str, sub_cat: str):
    node_id = f"{dept}::{sub_cat}"
    if not s.review_graph.has_node(node_id):
        s.review_graph.add_node(
            node_id, node_type="sub_category", label=sub_cat, dept=dept,
        )
        s.review_graph.add_edge(dept, node_id, edge_type="has_category")


def graph_add_review(s: State, dept: str, sub_cat: str, review_text: str):
    sub_node = f"{dept}::{sub_cat}"
    review_node = f"review::{len(s.review_graph.nodes)}"
    short_text = review_text[:60] + "..." if len(review_text) > 60 else review_text

    s.review_graph.add_node(
        review_node, node_type="review", label=short_text, dept=dept, color="#DFE6E9",
    )
    s.review_graph.add_edge(sub_node, review_node, edge_type="has_review")
    return review_node


def graph_to_json(s: State) -> dict:
    """
    Plain node/edge list. Layout (department branches and review placement)
    is computed client-side.
    """
    nodes = []
    for n, data in s.review_graph.nodes(data=True):
        node_type = data.get("node_type")
        entry = {"id": n, "type": node_type, "color": data.get("color")}
        if node_type == "department":
            entry["label"] = n
        elif node_type == "sub_category":
            dept, label = data["dept"], data["label"]
            count = s.knowledge_base[dept]["sub_categories"][label]["count"]
            entry["label"] = label
            entry["dept"] = dept
            entry["count"] = count
        elif node_type == "review":
            entry["label"] = data.get("label", "")
            entry["dept"] = data.get("dept")
        nodes.append(entry)

    # Full review text per (dept, sub_category) so the frontend drawer
    # can show every review rather than the 60-char truncated label.
    # Keyed two ways:
    #   - by (dept, sub_cat) for human reads
    #   - by node id (`{dept}::{sub_cat}`) so the frontend can look up
    #     reviews by clicking any sub-category node without re-deriving
    #     the id from dept + label
    reviews_by_sub = {
        dept: {
            sub: list(s.knowledge_base[dept]["sub_categories"][sub]["reviews"])
            for sub in s.knowledge_base[dept]["sub_categories"]
        }
        for dept in config.DEPARTMENTS
    }
    reviews_by_node_id = {
        f"{dept}::{sub}": list(s.knowledge_base[dept]["sub_categories"][sub]["reviews"])
        for dept in config.DEPARTMENTS
        for sub in s.knowledge_base[dept]["sub_categories"]
    }

    edges = [
        {"source": u, "target": v, "type": d.get("edge_type")}
        for u, v, d in s.review_graph.edges(data=True)
    ]

    stats = {
        "departments": len(config.DEPARTMENTS),
        "sub_categories": sum(len(s.knowledge_base[d]["sub_categories"]) for d in config.DEPARTMENTS),
        "reviews": sum(
            data["count"]
            for d in config.DEPARTMENTS
            for data in s.knowledge_base[d]["sub_categories"].values()
        ),
        "graph_nodes": s.review_graph.number_of_nodes(),
    }

    return {
        "nodes": nodes,
        "edges": edges,
        "stats": stats,
        "reviews_by_sub": reviews_by_sub,
        "reviews_by_node_id": reviews_by_node_id,
    }
