import uuid
from typing import List, Dict, Any
from db.vector_client import query_visit_notes


def retrieve_semantic_notes(
    patient_id: uuid.UUID,
    user_query: str,
    top_k: int = 5
) -> List[Dict[str, Any]]:
    """
    Performs vector similarity search against patient's clinical visit notes in ChromaDB.
    """
    return query_visit_notes(patient_id=patient_id, query_text=user_query, top_k=top_k)
