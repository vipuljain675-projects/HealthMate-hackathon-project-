import os
import re
from typing import Dict, Any
from dotenv import load_dotenv
from augmentation.prompt_builder import build_timeline_prompt

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "groq/compound")


def clean_llm_response(text: str) -> str:
    """Removes internal reasoning <think>...</think> tags from LLM outputs."""
    if not text:
        return ""
    cleaned = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
    cleaned = re.sub(r'<think>.*', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'</?think>', '', cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


def generate_timeline_summary(patient_name: str, structured_facts: Dict[str, Any]) -> str:
    """Generates an AI-synthesized health timeline overview."""
    visits = structured_facts.get("visits", [])
    meds = structured_facts.get("medications", [])
    labs = structured_facts.get("labs", [])

    prompt = build_timeline_prompt(patient_name, structured_facts)

    if not GROQ_API_KEY:
        return _build_fallback_timeline(patient_name, visits, meds, labs)

    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)

        models_to_try = ["openai/gpt-oss-120b", "groq/compound", "groq/compound-mini"]
        last_error = None

        for mod in models_to_try:
            try:
                response = client.chat.completions.create(
                    model=mod,
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a medical AI assistant. Synthesize a clean, professional, bulleted health history timeline in markdown. Do NOT output raw code, python dictionaries, or brackets."
                        },
                        {"role": "user", "content": prompt[:3000]}
                    ],
                    temperature=0.2,
                    max_tokens=600
                )

                raw = response.choices[0].message.content or ""
                cleaned = clean_llm_response(raw)

                # Validate response does not contain raw dict string garbage
                if cleaned and "test_name" not in cleaned and "patient_id" not in cleaned and len(cleaned) > 30:
                    return cleaned
            except Exception as ex:
                last_error = ex
                print(f"[TimelineSummarizer] Model {mod} error: {ex}. Retrying next model...")
                continue

        # If LLMs fail or returned dict garbage
        return _build_fallback_timeline(patient_name, visits, meds, labs)

    except Exception as e:
        print(f"[TimelineSummarizer] LLM error: {e}")
        return _build_fallback_timeline(patient_name, visits, meds, labs)


def _build_fallback_timeline(patient_name: str, visits: list, meds: list, labs: list) -> str:
    """Fallback clean markdown timeline summary."""
    lines = [f"### Health Summary for {patient_name}\n"]
    lines.append(f"• **Recorded Consultations:** {len(visits)} visit(s)")
    lines.append(f"• **Active Prescriptions:** {len([m for m in meds if m.get('status') == 'active'])} medication(s)")
    lines.append(f"• **Lab Diagnostics:** {len(labs)} test(s) on file\n")

    if visits:
        lines.append("**Key Medical Events:**")
        for v in visits[:4]:
            doc_str = f"Dr. {v.get('doctor')}" if v.get('doctor') else "Consultant"
            hosp_str = f" at {v.get('hospital')}" if v.get('hospital') else ""
            diag_str = f" — *{v.get('diagnosis') or v.get('reason')}*" if (v.get('diagnosis') or v.get('reason')) else ""
            lines.append(f"- **{v.get('date')}**: {doc_str}{hosp_str}{diag_str}")

    return "\n".join(lines)
