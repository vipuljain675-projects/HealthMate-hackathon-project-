import re
from typing import Dict, Any, List


def format_doctor_name(doc: Optional[str]) -> str:
    if not doc:
        return "Unknown Doctor"
    cleaned = re.sub(r'^(dr\.\s*|dr\s+)', '', doc.strip(), flags=re.IGNORECASE).strip()
    return f"Dr. {cleaned}" if cleaned else "Unknown Doctor"


def build_timeline_prompt(patient_name: str, structured_facts: Dict[str, Any]) -> str:
    """Builds a prompt for synthesizing a patient's health timeline."""
    visits = structured_facts.get("visits", [])
    meds = structured_facts.get("medications", [])
    labs = structured_facts.get("labs", [])
    appts = structured_facts.get("appointments", [])

    formatted_visits = []
    for v in visits:
        doc_name = format_doctor_name(v.get('doctor'))
        v_str = f"Date: {v.get('date')}, Doctor: {doc_name}, Location/Lab: {v.get('hospital', 'N/A')}, Reason/Diagnosis: {v.get('diagnosis') or v.get('reason') or 'N/A'}"
        if v.get('medications'):
            v_meds = ", ".join([f"{m.get('drug_name')} {m.get('dosage','')}" for m in v['medications']])
            v_str += f", Prescribed: [{v_meds}]"
        if v.get('labs'):
            v_labs = ", ".join([f"{l.get('test_name')}: {l.get('value')} ({l.get('flag')})" for l in v['labs']])
            v_str += f", Lab Tests: [{v_labs}]"
        formatted_visits.append(v_str)

    visits_text = "\n".join(formatted_visits) if formatted_visits else "No visits recorded."

    return f"""You are a professional medical communicator. Create a clean, 2-3 paragraph markdown summary of the patient's medical timeline for {patient_name}.

PATIENT RECORDS:
Visits & Consultations:
{visits_text}

INSTRUCTIONS:
1. Write a clear, professional, natural narrative of the patient's health history in 2-3 short bulleted sections or paragraphs.
2. Group the highlights by consultations, active treatment, and diagnostic findings.
3. DO NOT output code, raw JSON, Python dictionaries, or technical IDs. Output ONLY clean Markdown text.
"""


def build_qa_prompt(
    patient_name: str,
    user_question: str,
    structured_facts: Dict[str, Any],
    vector_notes: List[Dict[str, Any]]
) -> str:
    """Builds a clean, visit-centric RAG context prompt."""
    visits = structured_facts.get("visits", [])
    meds = structured_facts.get("medications", [])
    labs = structured_facts.get("labs", [])
    appts = structured_facts.get("appointments", [])

    # Group records by visit so each doctor visit has its exact medications and lab tests
    visit_blocks = []
    for idx, v in enumerate(visits, 1):
        v_date = v.get("date", "Unknown date")
        v_doc = format_doctor_name(v.get("doctor"))
        v_hosp = v.get("hospital", "Medical facility")
        v_reason = v.get("reason") or "N/A"
        v_diag = v.get("diagnosis") or "N/A"
        v_url = v.get("original_file_url")

        block = f"--- VISIT RECORD #{idx} ({v_date}) ---\n"
        block += f"• Date: {v_date}\n"
        block += f"• Consulting Doctor: {v_doc}\n"
        block += f"• Hospital/Clinic/Lab: {v_hosp}\n"
        block += f"• Reason / Panel: {v_reason}\n"
        block += f"• Diagnosis / Impression: {v_diag}\n"
        if v_url:
            block += f"• Document Scan URL: {v_url}\n"

        v_meds = v.get("medications", [])
        if v_meds:
            block += "  [Prescribed Medications in this Visit]:\n"
            for m in v_meds:
                block += f"    - {m.get('drug_name')} {m.get('dosage','')}".strip()
                if m.get('frequency'): block += f" ({m['frequency']})"
                if m.get('duration_days'): block += f" for {m['duration_days']}"
                block += "\n"
        else:
            block += "  [Prescribed Medications]: None in this visit\n"

        v_labs = v.get("labs", [])
        if v_labs:
            block += "  [Lab Tests Conducted in this Visit]:\n"
            for l in v_labs:
                flag = l.get('flag', 'normal')
                flag_str = f" ({flag.upper()})" if flag and flag.lower() != 'normal' else ""
                block += f"    - {l.get('test_name')}: {l.get('value')}{flag_str}\n"
        else:
            block += "  [Lab Tests Conducted]: None in this visit\n"

        if v.get("notes"):
            block += f"  [Clinical Notes]: {v['notes'][:300]}\n"

        visit_blocks.append(block)

    visits_text = "\n".join(visit_blocks) if visit_blocks else "No visit records found."

    # General Active Meds summary
    active_meds = [m for m in meds if m.get("status", "active") == "active"]
    active_meds_text = ", ".join([f"{m.get('drug_name')} {m.get('dosage','')}" for m in active_meds]) if active_meds else "None"

    # Clinical Notes from vector retrieval
    notes_lines = []
    for idx, n in enumerate(vector_notes, 1):
        note_text = (n.get("note") or "")[:350]
        n_doc = format_doctor_name(n.get('doctor_name'))
        notes_lines.append(f"Excerpt #{idx} ({n.get('date', '')}, {n_doc}): \"{note_text}\"")
    notes_text = "\n".join(notes_lines[:4]) if notes_lines else "None"

    return f"""PATIENT NAME: {patient_name}

OVERVIEW OF PATIENT DATA:
- Total Visits: {len(visits)}
- Active Prescribed Medications: {active_meds_text}
- Total Lab Tests: {len(labs)}

DETAILED CLINICAL VISIT RECORDS (BOUND BY CONSULTATION):
{visits_text}

RELEVANT CLINICAL NOTES FROM SEARCH:
{notes_text}

USER QUESTION:
"{user_question}"
"""
