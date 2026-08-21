import os
import uuid
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings

CHROMA_DATA_DIR = os.getenv("CHROMA_DATA_DIR", "./data/chroma_db")

os.makedirs(CHROMA_DATA_DIR, exist_ok=True)

chroma_client = chromadb.PersistentClient(path=CHROMA_DATA_DIR)
collection = chroma_client.get_or_create_collection(
    name="clinical_visit_notes",
    metadata={"hnsw:space": "cosine"}
)


def add_visit_note_embedding(
    patient_id: uuid.UUID,
    visit_id: uuid.UUID,
    notes: str,
    doctor_name: Optional[str] = None,
    hospital: Optional[str] = None,
    visit_date: Optional[str] = None
):
    """Upsert a free-text visit note into ChromaDB vector store."""
    if not notes or not notes.strip():
        return

    doc_id = f"visit_{visit_id}"
    metadata = {
        "patient_id": str(patient_id),
        "visit_id": str(visit_id),
        "doctor_name": doctor_name or "",
        "hospital": hospital or "",
        "date": str(visit_date) if visit_date else ""
    }

    collection.upsert(
        ids=[doc_id],
        documents=[notes.strip()],
        metadatas=[metadata]
    )


def query_visit_notes(
    patient_id: uuid.UUID,
    query_text: str,
    top_k: int = 5
) -> List[Dict[str, Any]]:
    """Retrieve top-k relevant clinical visit notes matching user prompt, scoped to patient_id."""
    if not query_text or not query_text.strip():
        return []

    where_filter = {"patient_id": str(patient_id)}

    try:
        results = collection.query(
            query_texts=[query_text],
            n_results=top_k,
            where=where_filter
        )
    except Exception as e:
        print(f"[VectorClient] Query error: {e}")
        return []

    formatted_results = []
    if results and results.get("documents") and results["documents"][0]:
        documents = results["documents"][0]
        metadatas = results["metadatas"][0] if results.get("metadatas") else []
        distances = results["distances"][0] if results.get("distances") else []

        for idx, doc in enumerate(documents):
            meta = metadatas[idx] if idx < len(metadatas) else {}
            dist = distances[idx] if idx < len(distances) else 1.0
            formatted_results.append({
                "note": doc,
                "visit_id": meta.get("visit_id"),
                "doctor_name": meta.get("doctor_name"),
                "hospital": meta.get("hospital"),
                "date": meta.get("date"),
                "similarity_score": round(1.0 - dist, 4)
            })

    return formatted_results
