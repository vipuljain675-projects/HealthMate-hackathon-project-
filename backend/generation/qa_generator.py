import os
import re
import uuid
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from retrieval.structured_retriever import retrieve_structured_patient_facts
from retrieval.semantic_retriever import retrieve_semantic_notes
from augmentation.prompt_builder import build_qa_prompt, format_doctor_name

load_dotenv()

def get_groq_api_key() -> str:
    return (os.getenv("GROQ_API_KEY") or "").strip()


def clean_llm_response(text: str) -> str:

    """Strips internal reasoning / thinking process from LLM output."""
    if not text:
        return ""
    text = re.sub(r'<think>[\s\S]*?</think>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'<think>[\s\S]*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'</?think>', '', text, flags=re.IGNORECASE)
    return text.strip()


def extract_query_filters(user_question: str) -> Dict[str, Optional[str]]:
    """Attempts simple keyword extraction for hospital or doctor filters."""
    filters = {"hospital": None, "doctor_name": None}
    words = user_question.split()
    for idx, w in enumerate(words):
        if w.lower() in ["dr.", "dr", "doctor"] and idx + 1 < len(words):
            filters["doctor_name"] = words[idx + 1].strip("?,.")
        if w.lower() in ["clinic", "hospital", "care"] and idx > 0:
            filters["hospital"] = words[idx - 1].strip("?,.")
    return filters


def answer_patient_question(
    db: Session,
    patient_id: uuid.UUID,
    patient_name: str,
    user_question: str
) -> Dict[str, Any]:
    """
    Full RAG pipeline:
    1. Parse question filters
    2. Retrieve structured facts + vector clinical note snippets
    3. Generate grounded AI response
    """
    structured_facts = retrieve_structured_patient_facts(
        db,
        patient_id=patient_id
    )

    vector_notes = retrieve_semantic_notes(
        patient_id=patient_id,
        user_query=user_question,
        top_k=6
    )

    prompt = build_qa_prompt(
        patient_name=patient_name,
        user_question=user_question,
        structured_facts=structured_facts,
        vector_notes=vector_notes
    )

    api_key = get_groq_api_key()
    if not api_key:
        print("[QAGenerator] GROQ_API_KEY not set. Using rule-based fallback answer.")
        answer = _build_fallback_from_records(patient_name, user_question, structured_facts)
        return {
            "question": user_question,
            "answer": answer,
            "sources": {
                "visits_count": len(structured_facts.get("visits", [])),
                "labs_count": len(structured_facts.get("labs", [])),
                "matching_notes_count": len(vector_notes),
                "retrieved_notes": vector_notes
            }
        }

    import httpx
    system_message = (
        f"You are a smart, empathetic AI Personal Health Assistant for {patient_name}.\n\n"
        "GUIDELINES FOR YOUR RESPONSE:\n"
        "1. FOCUS ON THE SPECIFIC QUESTION ASKED: Answer the user's question directly, accurately, and concisely. "
        "Do NOT dump unrelated sections, full medication lists, or lab tables UNLESS the user explicitly asks for them or if they directly pertain to the question.\n"
        "2. ACCURATE ATTRIBUTION: When referencing a doctor, hospital, prescription, or lab test, ensure you attribute them to the EXACT visit where they occurred.\n"
        "3. NATURAL & CONVERSATIONAL: Respond naturally like a knowledgeable clinical AI companion. "
        "Use clean markdown formatting, bold key terms, and bullet points where helpful.\n"
        "4. GENERAL HEALTH KNOWLEDGE: If the user asks general medical questions (e.g. 'What is cholesterol?', 'What should I eat?', 'Explain my diagnosis'), "
        "provide accurate health advice using general clinical knowledge while referencing their personal health data if relevant.\n"
        "5. NO CONTRADICTIONS: Never contradict yourself in the same response. Do not list information and then state it could not be found.\n"
        "6. DOCUMENT SCANS: If the user asks for their document or scan image, provide the exact scan URL from the visit record in a clickable link.\n"
        "7. DISCLAIMER: Always conclude with a brief, gentle 1-line standard medical disclaimer."
    )

    prompt_to_send = prompt[:6000]
    models_to_try = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "groq/compound-mini", "qwen/qwen3.6-27b"]
    last_error = None

    # First attempt: Direct HTTPX call to api.groq.com (bypasses SDK connection bugs on Linux/Render)
    for mod in models_to_try:
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": mod,
                "messages": [
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": prompt_to_send}
                ],
                "temperature": 0.2,
                "max_tokens": 1500
            }
            with httpx.Client(timeout=45.0, follow_redirects=True) as client:
                resp = client.post(url, headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()
                raw_answer = data["choices"][0]["message"]["content"] or ""

            cleaned_answer = clean_llm_response(raw_answer)
            if not cleaned_answer and "<think>" in raw_answer:
                cleaned_answer = re.sub(r'<think>', '', raw_answer, flags=re.IGNORECASE).strip()

            if not cleaned_answer or len(cleaned_answer) < 15:
                cleaned_answer = _build_fallback_from_records(patient_name, user_question, structured_facts)

            return {
                "question": user_question,
                "answer": cleaned_answer,
                "sources": {
                    "visits_count": len(structured_facts.get("visits", [])),
                    "labs_count": len(structured_facts.get("labs", [])),
                    "matching_notes_count": len(vector_notes),
                    "retrieved_notes": vector_notes
                }
            }

        except Exception as ex:

            last_error = ex
            print(f"[QAGenerator] HTTPX model {mod} error: {ex}. Retrying...")
            continue

    print(f"[QAGenerator] All models failed, last error: {type(last_error).__name__}: {last_error}")
    fallback = _build_fallback_from_records(patient_name, user_question, structured_facts)
    return {
        "question": user_question,
        "answer": fallback,
        "sources": {"error": f"{type(last_error).__name__}: {last_error}"}
    }




def _build_fallback_from_records(patient_name: str, question: str, facts: Dict[str, Any]) -> str:
    """Builds a targeted, direct answer from structured records when LLMs fail."""
    visits = facts.get("visits", [])
    meds = facts.get("medications", [])
    labs = facts.get("labs", [])

    q = question.lower()

    # 0. Document / Scan link query (HIGHEST PRIORITY)
    if any(w in q for w in ["scan", "document", "upload", "file", "image", "give me back", "original"]):
        scan_visits = [v for v in visits if v.get("original_file_url")]
        if scan_visits:
            lines = [f"Here is your requested document scan, {patient_name}:\n"]
            for v in scan_visits:
                doc_name = format_doctor_name(v.get("doctor"))
                lines.append(f"• **{v.get('date')}** — {doc_name} at {v.get('hospital', 'Lab/Clinic')}:")
                lines.append(f"  📄 [Open Original Document Scan]({v['original_file_url']})")
            lines.append("\n*Disclaimer: Click the link above to view/download your original document scan.*")
            return "\n".join(lines)
        return f"I couldn't find any uploaded document scan links in your records, {patient_name}."

    # 1. Medication query (HIGHER PRIORITY THAN DOCTOR QUERY SO 'medicines prescribed by doctor' MATCHES MEDS)
    if any(w in q for w in ["medicine", "medication", "drug", "prescri", "pill", "tablet", "dosage", "treatment"]):
        if meds:
            lines = [f"Here are your active medications, {patient_name}:\n"]
            for m in meds:
                freq_str = f" — {m['frequency']}" if m.get('frequency') else ""
                dur_str = f" ({m['duration_days']})" if m.get('duration_days') else ""
                purpose_str = f" for {m['purpose']}" if m.get('purpose') else ""
                lines.append(f"• **{m.get('drug_name')}** ({m.get('dosage', 'N/A')}){freq_str}{dur_str}{purpose_str}")
            lines.append("\n*Disclaimer: This information is derived from your uploaded medical records.*")
            return "\n".join(lines)
        return f"No active medications are currently recorded in your profile, {patient_name}."

    # 2. Appointment / Scheduled visit query
    if any(w in q for w in ["appointment", "appt", "schedule", "upcoming", "next visit", "booking", "when is my doctor"]):
        appts = structured_facts.get("appointments", [])
        if appts:
            lines = [f"Here are your upcoming appointments, {patient_name}:\n"]
            for a in appts:
                doc_name = format_doctor_name(a.get("doctor_name"))
                lines.append(f"• **{a.get('appointment_date')} at {a.get('appointment_time', 'N/A')}** — {doc_name} at {a.get('hospital', 'Hospital/Clinic')} (*{a.get('reason', 'Consultation')}*)")
            lines.append("\n*Disclaimer: Derived from your recorded appointments in HealthVault.*")
            return "\n".join(lines)
        return f"You don't have any upcoming appointments scheduled in your profile, {patient_name}."

    # 2b. Doctor / Last Visit query
    if any(w in q for w in ["doctor", "physician", "consult", "last visit", "who did i see", "which doctor"]):
        if visits:
            latest = visits[0]
            doc_fmt = format_doctor_name(latest.get('doctor'))
            resp = f"Based on your records, your most recent medical visit was on **{latest.get('date')}** with **{doc_fmt}** at **{latest.get('hospital', 'N/A')}**."
            if latest.get("reason") or latest.get("diagnosis"):
                resp += f"\n\n- **Reason / Impression:** {latest.get('diagnosis') or latest.get('reason')}"
            if latest.get("original_file_url"):
                resp += f"\n- 📄 [View Original Document Scan]({latest['original_file_url']})"
            resp += "\n\n*Disclaimer: This information is derived from your uploaded medical records.*"
            return resp
        return f"I couldn't find any doctor visits recorded in your profile yet, {patient_name}."



    # 3. Lab query / medical interpretation (handles typos like 'cholestrol', 'colestrol', etc.)
    if any(w in q for w in ["lab", "test", "cholesterol", "cholestrol", "colestrol", "lipid", "blood", "report", "result", "diet", "eat", "food", "reduce"]):
        if labs:
            lines = []
            if any(w in q for w in ["bad", "high", "good", "mean", "should i", "eat", "diet", "what is", "reduce", "lower"]):
                lines.append(f"Regarding your query about your lab results, {patient_name}:\n")
                lines.append("A **Total Cholesterol of 200-239 mg/dL** is clinically categorized as **Borderline High / Elevated** (desirable target is <200 mg/dL). It is best managed with dietary changes, exercise, and doctor consultation.\n")
                lines.append("**Your Recorded Lab Values:**")
            else:
                lines.append(f"Here are your latest lab test results, {patient_name}:\n")

            for l in labs:
                flag = l.get('flag', 'normal')
                emoji = "⚠️" if flag.lower() in ["elevated", "high", "low", "abnormal", "borderline_high", "borderline high"] else "✅"
                lines.append(f"• {emoji} **{l.get('test_name')}**: {l.get('value')} (*{flag}*)")

            if any(w in q for w in ["eat", "diet", "food", "reduce", "lower"]):
                lines.append("\n**Dietary Recommendations to Lower Cholesterol:**\n- Increase soluble fiber (oats, legumes, fruits)\n- Choose healthy fats (olive oil, nuts, fish)\n- Limit saturated fats & fried foods")

            lines.append("\n*Disclaimer: This information is derived from your uploaded medical records and standard clinical reference ranges.*")
            return "\n".join(lines)
        return f"No lab test results found in your records, {patient_name}."

    # 4. General summary fallback
    return (
        f"Based on your records in HealthVault, {patient_name}:\n"
        f"• **Total Visits:** {len(visits)}\n"
        f"• **Active Medications:** {len(meds)}\n"
        f"• **Lab Results Recorded:** {len(labs)}\n\n"
        "Feel free to ask specifically about your medications, doctor visits, or lab test results!\n\n"
        "*Disclaimer: This information is derived from your uploaded medical records.*"
    )
