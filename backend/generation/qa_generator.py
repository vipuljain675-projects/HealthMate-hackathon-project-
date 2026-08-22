import os
import re
import uuid
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from retrieval.structured_retriever import retrieve_structured_patient_facts
from retrieval.semantic_retriever import retrieve_semantic_notes
from augmentation.prompt_builder import build_qa_prompt

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "groq/compound")


def clean_llm_response(text: str) -> str:
    """Strips internal reasoning / thinking process from LLM output."""
    if not text:
        return ""
    # Strip <think>...</think> blocks (qwen-style)
    text = re.sub(r'<think>[\s\S]*?</think>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'<think>[\s\S]*?(?=(Hello|Here is|Based on|I |You |Disclaimer:))', '', text, flags=re.IGNORECASE)
    text = re.sub(r'</?think>', '', text, flags=re.IGNORECASE)

    # Strip compound-mini style internal reasoning patterns (numbered lists + "**Evaluate**" blocks)
    patterns = [
        r'1\.\s+\*\*[A-Z][^*]+\*\*:[\s\S]+?(?=\n\nBased on|Based on|Disclaimer:)',
        r'\*\*Evaluate.*?\*\*[\s\S]*?(?=Based on|I couldn)',
        r'\*\*Formulate.*?\*\*[\s\S]*?(?=Based on|I couldn)',
        r'\*\*Check.*?\*\*[\s\S]*?(?=Based on|I couldn)',
        r'Draft:[\s\S]*?(?=Based on|Disclaimer:)',
        r'Self-Correction[\s\S]*?(?=Based on|Disclaimer:|$)',
        r'\[Output Generation\][\s\S]*',
        r'(?:Proceeds\.|All good\.|Final Check[\s\S]*?(?=Based on|$))',
    ]
    for pattern in patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)

    # Extract just the "Based on..." portion if internal reasoning leaked
    if 'Based on your' in text:
        idx = text.find('Based on your')
        text = text[idx:]

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
    filters = extract_query_filters(user_question)

    structured_facts = retrieve_structured_patient_facts(
        db,
        patient_id=patient_id,
        hospital=filters.get("hospital"),
        doctor_name=filters.get("doctor_name")
    )

    vector_notes = retrieve_semantic_notes(
        patient_id=patient_id,
        user_query=user_question,
        top_k=4
    )

    prompt = build_qa_prompt(
        patient_name=patient_name,
        user_question=user_question,
        structured_facts=structured_facts,
        vector_notes=vector_notes
    )

    if not GROQ_API_KEY:
        print("[QAGenerator] GROQ_API_KEY not set. Using rule-based fallback answer.")
        meds = structured_facts.get("medications", [])
        visits = structured_facts.get("visits", [])
        return {
            "question": user_question,
            "answer": (
                f"Based on your personal medical records for {patient_name}:\n\n"
                f"- You have {len(visits)} registered clinic/hospital visits.\n"
                f"- Active medications include: {', '.join([m.get('drug_name') + ' (' + str(m.get('dosage')) + ')' for m in meds]) or 'None'}.\n\n"
                "Disclaimer: This information is derived from your personal uploaded medical records and is not a substitute for professional clinical medical advice."
            ),
            "sources": {
                "visits_count": len(visits),
                "matching_notes_count": len(vector_notes),
                "retrieved_notes": vector_notes
            }
        }

    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)

        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a concise medical AI assistant. Output ONLY your direct answer to the patient. No internal reasoning."
                },
                {"role": "user", "content": prompt[:3000]}
            ],
            temperature=0.1,
            max_tokens=700
        )

        raw_answer = response.choices[0].message.content or "No response generated."
        cleaned_answer = clean_llm_response(raw_answer)

        return {
            "question": user_question,
            "answer": cleaned_answer,
            "sources": {
                "visits_count": len(structured_facts.get("visits", [])),
                "matching_notes_count": len(vector_notes),
                "retrieved_notes": vector_notes
            }
        }

    except Exception as e:
        print(f"[QAGenerator] LLM error: {e}")
        return {
            "question": user_question,
            "answer": f"I encountered an issue processing your query against your records. Error: {str(e)}",
            "sources": {"error": str(e)}
        }
