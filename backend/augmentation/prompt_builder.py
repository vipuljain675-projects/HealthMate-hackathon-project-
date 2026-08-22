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

    # Pre-build human-readable doctor list for easier extraction
    doctors_seen = list({
        v.get("doctor") for v in visits if v.get("doctor")
    })
    doctors_str = ", ".join(doctors_seen) if doctors_seen else "None recorded"

    meds_detail_list = []
    for m in meds:
        name = m.get("drug_name", "")
        dosage = m.get("dosage", "")
        freq = m.get("frequency", "")
        duration = m.get("duration_days", "")
        notes = m.get("notes") or m.get("purpose") or ""
        
        detail = f"{name} {dosage}".strip()
        if freq:
            detail += f" (Frequency: {freq})"
        if duration:
            detail += f" (Duration: {duration} days)" if str(duration).isdigit() else f" (Duration: {duration})"
        if notes:
            detail += f" [Notes/Instructions: {notes}]"
        meds_detail_list.append(detail)

    meds_str = "\n  - ".join(meds_detail_list) if meds_detail_list else "None"

    labs_str = ", ".join(
        f"{l.get('test_name')}: {l.get('value')} ({l.get('flag', '')})"
        for l in labs
    ) if labs else "None"

    clean_visits = [
        {
            "date": v.get("date"),
            "doctor": v.get("doctor"),
            "hospital": v.get("hospital"),
            "diagnosis": v.get("diagnosis"),
            "reason": v.get("reason"),
            "notes": (v.get("notes") or "")[:800],
            "original_file_url": v.get("original_file_url")
        }
        for v in visits
    ]

    notes_str = ""
    for idx, n in enumerate(vector_notes, 1):
        note_text = (n.get("note") or "")[:300]
        notes_str += f"\nNote #{idx} (Date: {n.get('date')}, Doctor: {n.get('doctor_name')}, Hospital: {n.get('hospital')}):\n\"{note_text}\"\n"

    # Ensure notes_str is kept concise
    notes_str = notes_str[:1200]

    return f"""You are a helpful, accurate personal health AI assistant for {patient_name}.

Answer the patient's question based strictly on their personal medical records provided below.

--- QUICK FACTS SUMMARY ---
- Doctors consulted: {doctors_str}
- Active medications: {meds_str}
- Lab results: {labs_str}
- Upcoming appointments: {len(appts)} scheduled

--- FULL VISIT RECORDS ---
{clean_visits}

--- FULL MEDICATIONS RECORDS ---
{meds}

--- FULL LAB TEST RECORDS ---
{labs}

--- RELEVANT CLINICAL NOTES ---
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
