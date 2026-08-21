from typing import Dict, Any, List


def build_timeline_prompt(patient_name: str, structured_facts: Dict[str, Any]) -> str:
    """Builds a prompt for synthesizing a patient's health timeline."""
    visits = structured_facts.get("visits", [])
    meds = structured_facts.get("medications", [])
    labs = structured_facts.get("labs", [])
    appts = structured_facts.get("appointments", [])

    return f"""You are an empathetic medical assistant creating a clean, chronological health timeline for {patient_name}.

Patient Data Summary:
- Visits ({len(visits)}): {visits}
- Current & Past Medications ({len(meds)}): {meds}
- Lab Tests ({len(labs)}): {labs}
- Upcoming/Past Appointments ({len(appts)}): {appts}

Instructions:
1. Summarize the patient's medical story chronologically from oldest to newest.
2. Clearly highlight major diagnoses, hospital visits, active medications, key lab values, and upcoming appointments.
3. Keep the tone patient-friendly, easy to read, and clear.
"""


def build_qa_prompt(
    patient_name: str,
    user_question: str,
    structured_facts: Dict[str, Any],
    vector_notes: List[Dict[str, Any]]
) -> str:
    """Builds an augmented RAG context prompt for answering user health questions."""
    visits = structured_facts.get("visits", [])
    meds = structured_facts.get("medications", [])
    labs = structured_facts.get("labs", [])
    appts = structured_facts.get("appointments", [])

    notes_str = ""
    for idx, n in enumerate(vector_notes, 1):
        notes_str += f"\nNote #{idx} (Date: {n.get('date')}, Doctor: {n.get('doctor_name')}, Hospital: {n.get('hospital')}):\n\"{n.get('note')}\"\n"

    return f"""You are a helpful, accurate personal health AI assistant for {patient_name}.

Answer the patient's question based strictly on their personal medical records provided below.

--- STRUCTURED MEDICAL FACTS (SQL Records) ---
- Visits (includes original_file_url for uploaded document scans): {visits}
- Active & Past Medications: {meds}
- Lab Test Results: {labs}
- Appointments: {appts}

--- RELEVANT CLINICAL NOTES (Vector Search Matches) ---
{notes_str if notes_str else "No specific matching clinical notes found."}

--- PATIENT QUESTION ---
"{user_question}"

--- INSTRUCTIONS FOR ANSWERING ---
1. Provide a direct, reassuring, and precise answer.
2. If citing a medication, doctor, lab value, or visit, mention the date or doctor name if available.
3. If the patient asks for their document, original file, prescription scan, report link, or image, ALWAYS include the direct URL (original_file_url) in your answer text so they can click and view/download it directly.
4. If the answer cannot be found in the provided records, state clearly: "Based on your uploaded medical records, I couldn't find specific information regarding this."
5. Add a gentle standard disclaimer: "Disclaimer: This information is derived from your personal uploaded medical records and is not a substitute for professional clinical medical advice."
"""
