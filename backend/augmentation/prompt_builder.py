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


def _summarize_visits(visits: list) -> str:
    """Builds a human-readable summary of all doctor visits for the prompt."""
    if not visits:
        return "No visits recorded."
    lines = []
    for v in visits:
        doc = v.get("doctor") or "Unknown Doctor"
        hosp = v.get("hospital") or "Unknown Hospital"
        date = v.get("date") or "Unknown Date"
        diag = v.get("diagnosis") or ""
        lines.append(f"  - {date}: Dr. {doc} at {hosp}" + (f" — Diagnosis: {diag}" if diag else ""))
    return "\n".join(lines)


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

    # Pre-build human-readable doctor list for easier extraction
    doctors_seen = list({
        v.get("doctor") for v in visits if v.get("doctor")
    })
    doctors_str = ", ".join(doctors_seen) if doctors_seen else "None recorded"

    meds_str = ", ".join(
        f"{m.get('drug_name')} {m.get('dosage')} ({m.get('frequency')})"
        for m in meds
    ) if meds else "None"

    labs_str = ", ".join(
        f"{l.get('test_name')}: {l.get('value')} ({l.get('flag', '')})"
        for l in labs
    ) if labs else "None"

    notes_str = ""
    for idx, n in enumerate(vector_notes, 1):
        notes_str += f"\nNote #{idx} (Date: {n.get('date')}, Doctor: {n.get('doctor_name')}, Hospital: {n.get('hospital')}):\n\"{n.get('note')}\"\n"

    return f"""You are a helpful, accurate personal health AI assistant for {patient_name}.

Answer the patient's question based strictly on their personal medical records provided below.

--- QUICK FACTS SUMMARY ---
- Doctors consulted: {doctors_str}
- Active medications: {meds_str}
- Lab results: {labs_str}
- Upcoming appointments: {len(appts)} scheduled

--- FULL VISIT RECORDS (with doctor, hospital, diagnosis, file URLs) ---
{visits}

--- FULL MEDICATIONS RECORDS ---
{meds}

--- FULL LAB TEST RECORDS ---
{labs}

--- RELEVANT CLINICAL NOTES (Vector Search Matches) ---
{notes_str if notes_str else "No specific matching clinical notes found."}

--- PATIENT QUESTION ---
"{user_question}"

--- INSTRUCTIONS FOR ANSWERING ---
1. Provide a direct, reassuring, and precise answer grounded ONLY in the above records.
2. When answering about doctors, use the 'Doctors consulted' list — ALL doctors listed there are confirmed in records.
3. If citing a medication, doctor, lab value, or visit, mention the date or doctor name if available.
4. If the patient asks for their document, original file, prescription scan, report link, or image, ALWAYS include the direct URL (original_file_url) in your answer text so they can click and view/download it directly.
5. If the answer cannot be found in the provided records, state clearly: "Based on your uploaded medical records, I couldn't find specific information regarding this."
6. Add a gentle standard disclaimer: "Disclaimer: This information is derived from your personal uploaded medical records and is not a substitute for professional clinical medical advice."
"""
