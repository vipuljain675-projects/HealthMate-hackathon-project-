import os
import uuid
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings

is_vercel = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))
CHROMA_DATA_DIR = os.getenv("CHROMA_DATA_DIR", "/tmp/chroma_db" if is_vercel else "./data/chroma_db")

try:
    os.makedirs(CHROMA_DATA_DIR, exist_ok=True)
    chroma_client = chromadb.PersistentClient(path=CHROMA_DATA_DIR)
except Exception as e:
    print(f"[VectorDB] Fallback to in-memory ChromaDB due to disk error: {e}")
    chroma_client = chromadb.EphemeralClient()

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
        "date": str(visit_date) if visit_date else "",
        "doc_type": "visit_note"
    }

    collection.upsert(
        ids=[doc_id],
        documents=[notes.strip()],
        metadatas=[metadata]
    )


def add_lab_results_embedding(
    patient_id: uuid.UUID,
    visit_id: uuid.UUID,
    labs: List[Dict[str, Any]],
    doctor_name: Optional[str] = None,
    hospital: Optional[str] = None,
    visit_date: Optional[str] = None
):
    """
    Creates a rich vector embedding specifically for lab results.
    Formats lab data as readable text so vector search can find it when users ask about tests.
    """
    if not labs:
        return

    # Build a comprehensive, searchable text from lab results
    parts = []
    parts.append(f"Lab Test Results from {hospital or 'medical facility'} on {visit_date or 'recent date'}.")
    if doctor_name:
        parts.append(f"Ordered by Dr. {doctor_name}.")

    for lab in labs:
        test = lab.get("test_name", "")
        value = lab.get("value", "N/A")
        flag = lab.get("flag", "normal")
        unit = lab.get("unit", "")
        ref_range = lab.get("reference_range", "")

        line = f"Test: {test}, Result: {value}"
        if unit:
            line += f" {unit}"
        if ref_range:
            line += f", Reference Range: {ref_range}"
        line += f", Interpretation: {flag}"
        parts.append(line)

    # Add a summary line
    abnormal_tests = [l.get("test_name", "") for l in labs
                      if l.get("flag", "normal").lower() in ["elevated", "high", "low", "abnormal", "borderline_high", "borderline high"]]
    if abnormal_tests:
        parts.append(f"Abnormal findings: {', '.join(abnormal_tests)}")

    lab_text = ". ".join(parts)

    doc_id = f"labs_{visit_id}"
    metadata = {
        "patient_id": str(patient_id),
        "visit_id": str(visit_id),
        "doctor_name": doctor_name or "",
        "hospital": hospital or "",
        "date": str(visit_date) if visit_date else "",
        "doc_type": "lab_results"
    }

    collection.upsert(
        ids=[doc_id],
        documents=[lab_text],
        metadatas=[metadata]
    )


def add_medication_embedding(
    patient_id: uuid.UUID,
    visit_id: uuid.UUID,
    medications: List[Dict[str, Any]],
    doctor_name: Optional[str] = None,
    hospital: Optional[str] = None,
    visit_date: Optional[str] = None
):
    """
    Creates a vector embedding for prescribed medications.
    Makes medication queries more accurate in vector search.
    """
    if not medications:
        return

    parts = []
    parts.append(f"Medications prescribed from {hospital or 'medical facility'} on {visit_date or 'recent date'}.")
    if doctor_name:
        parts.append(f"Prescribed by Dr. {doctor_name}.")

    for med in medications:
        name = med.get("drug_name", "")
        dosage = med.get("dosage", "")
        freq = med.get("frequency", "")
        purpose = med.get("purpose", "")
        duration = med.get("duration_days", "")

        line = f"Medicine: {name} {dosage}".strip()
        if freq:
            line += f", Frequency: {freq}"
        if purpose:
            line += f", Purpose: {purpose}"
        if duration:
            line += f", Duration: {duration}"
        parts.append(line)

    med_text = ". ".join(parts)

    doc_id = f"meds_{visit_id}"
    metadata = {
        "patient_id": str(patient_id),
        "visit_id": str(visit_id),
        "doctor_name": doctor_name or "",
        "hospital": hospital or "",
        "date": str(visit_date) if visit_date else "",
        "doc_type": "medications"
    }

    collection.upsert(
        ids=[doc_id],
        documents=[med_text],
        metadatas=[metadata]
    )


def query_visit_notes(
    patient_id: uuid.UUID,
    query_text: str,
    top_k: int = 6
) -> List[Dict[str, Any]]:
    """Retrieve top-k relevant clinical visit notes matching user prompt, scoped to patient_id."""
    if not query_text or not query_text.strip():
        return []

    where_filter = {"patient_id": str(patient_id)}

    try:
        # Get count first to avoid requesting more results than available
        count = collection.count()
        effective_k = min(top_k, max(count, 1))

        results = collection.query(
            query_texts=[query_text],
            n_results=effective_k,
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
                "doc_type": meta.get("doc_type", "visit_note"),
                "similarity_score": round(1.0 - dist, 4)
            })

    return formatted_results
