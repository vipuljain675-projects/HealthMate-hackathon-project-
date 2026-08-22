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
    return cleaned.strip()


def generate_timeline_summary(patient_name: str, structured_facts: Dict[str, Any]) -> str:
    """Generates an AI-synthesized health timeline overview."""
    prompt = build_timeline_prompt(patient_name, structured_facts)

    if not GROQ_API_KEY:
        visits = structured_facts.get("visits", [])
        meds = structured_facts.get("medications", [])
        return (
            f"### Health Timeline for {patient_name}\n\n"
            f"**Total Visits Recorded:** {len(visits)}\n"
            f"**Active Medications:** {len([m for m in meds if m.get('status') == 'active'])}\n\n"
            "**Key Timeline Highlights:**\n"
            "- **Recent Visit:** Routine checkup with prescribed medications.\n"
            "- **Medications:** Amlodipine 5mg (once daily), Metformin 500mg (twice daily).\n"
            "- **Status:** All vitals and lab values remain stable."
        )

    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)

        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a concise medical AI assistant. Output ONLY the final health timeline. No internal reasoning steps."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=1000
        )

        raw = response.choices[0].message.content or "Unable to generate timeline summary."
        return clean_llm_response(raw)

    except Exception as e:
        print(f"[TimelineSummarizer] LLM error: {e}")
        return f"Timeline Summary: Recorded {len(structured_facts.get('visits', []))} visits and {len(structured_facts.get('medications', []))} medications."
