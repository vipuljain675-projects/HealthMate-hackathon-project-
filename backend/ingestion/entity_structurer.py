import os
import re
import json
from typing import List, Optional
from datetime import date
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "groq/compound")


def clean_json_string(text: str) -> str:
    """Strips thinking tags and extracts valid JSON between braces."""
    if not text:
        return "{}"
    cleaned = re.sub(r'<think>[\s\S]*?</think>', '', text, flags=re.IGNORECASE)
    cleaned = re.sub(r'<think>[\s\S]*', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'</?think>', '', cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.strip()

    start_idx = cleaned.find('{')
    end_idx = cleaned.rfind('}')
    if start_idx != -1 and end_idx != -1 and end_idx >= start_idx:
        return cleaned[start_idx:end_idx+1]
    return cleaned


class ExtractedMedication(BaseModel):
    drug_name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    purpose: Optional[str] = None
    duration_days: Optional[str] = None
    status: str = "active"


class ExtractedLab(BaseModel):
    test_name: str
    value: Optional[str] = None
    flag: Optional[str] = "normal"


class ExtractedVisit(BaseModel):
    date: Optional[str] = None  # YYYY-MM-DD (Optional to prevent Pydantic crash if LLM returns null)
    hospital: Optional[str] = None
    doctor_name: Optional[str] = None
    reason: Optional[str] = None
    diagnosis: Optional[str] = None
    notes: Optional[str] = None


class StructuredClinicalExtraction(BaseModel):
    visit: ExtractedVisit
    medications: List[ExtractedMedication] = Field(default_factory=list)
    labs: List[ExtractedLab] = Field(default_factory=list)
    free_text_notes: str


def parse_raw_text_to_entities(raw_text: str) -> StructuredClinicalExtraction:
    """
    Transforms raw medical text (from OCR or manual input) into structured clinical JSON.
    """
    if not GROQ_API_KEY:
        print("[EntityStructurer] GROQ_API_KEY not set. Using rule-based/mock parsing.")
        today_str = date.today().isoformat()
        return StructuredClinicalExtraction(
            visit=ExtractedVisit(
                date=today_str,
                hospital="City Care Clinic",
                doctor_name="Dr. Anjali Sharma",
                reason="Hypertension checkup",
                diagnosis="Essential Hypertension",
                notes="Patient complains of occasional afternoon headaches. Advised low-sodium diet."
            ),
            medications=[
                ExtractedMedication(drug_name="Amlodipine", dosage="5mg", frequency="once daily", purpose="BP control", duration_days="30 days"),
                ExtractedMedication(drug_name="Metformin", dosage="500mg", frequency="twice daily", purpose="Diabetes control", duration_days="30 days")
            ],
            labs=[
                ExtractedLab(test_name="HbA1c", value="6.2%", flag="normal"),
                ExtractedLab(test_name="Creatinine", value="0.9 mg/dL", flag="normal")
            ],
            free_text_notes="Patient complains of occasional afternoon headaches. Advised low-sodium diet."
        )

    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)

        system_prompt = (
            "You are a medical data extraction LLM. Extract structured JSON from raw clinical notes/OCR text.\n"
            "IMPORTANT RULES:\n"
            "- 'doctor_name': Extract the prescribing doctor from fields like 'Dr.', 'By:', 'Physician:', 'Consultant:', 'Doctor:', 'Referred by:'. "
            "For prescriptions, this is the doctor who SIGNS the Rx. For lab reports, this may be the referring/ordering doctor.\n"
            "- 'hospital': Extract clinic/hospital/lab name from header/letterhead. For Lal PathLabs reports, hospital = 'Lal PathLabs'. For Apollo reports, include branch.\n"
            "- 'date': Use DD-MM-YYYY or YYYY-MM-DD found in the document.\n"
            "- Do NOT confuse lab technician names with prescribing doctor names.\n"
            "Respond ONLY with valid JSON matching this exact structure:\n"
            "{\n"
            '  "visit": {\n'
            '    "date": "YYYY-MM-DD",\n'
            '    "hospital": "Hospital or clinic name or null",\n'
            '    "doctor_name": "Doctor name or null",\n'
            '    "reason": "Chief complaint or null",\n'
            '    "diagnosis": "Diagnosis or null",\n'
            '    "notes": "Narrative clinical impression or null"\n'
            "  },\n"
            '  "medications": [\n'
            '    {"drug_name": "Name", "dosage": "5mg", "frequency": "once daily", "purpose": "BP", "duration_days": "30 days", "status": "active"}\n'
            "  ],\n"
            '  "labs": [\n'
            '    {"test_name": "HbA1c", "value": "6.2%", "flag": "normal"}\n'
            "  ],\n"
            '  "free_text_notes": "Narrative doctor summary for vector search"\n'
            "}"
        )

        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Extract structured data from this raw clinical text:\n\n{raw_text[:3000]}"}
            ],
            temperature=0.1
        )

        raw_content = response.choices[0].message.content or "{}"
        json_str = clean_json_string(raw_content)

        parsed_dict = json.loads(json_str)
        visit_data = parsed_dict.get("visit", {}) or {}
        if not visit_data.get("date"):
            visit_data["date"] = date.today().isoformat()
        parsed_dict["visit"] = visit_data

        return StructuredClinicalExtraction(**parsed_dict)

    except Exception as e:
        print(f"[EntityStructurer] Parsing error: {e}")
        today_str = date.today().isoformat()
        return StructuredClinicalExtraction(
            visit=ExtractedVisit(
                date=today_str,
                reason="Medical Visit",
                notes=raw_text[:200]
            ),
            medications=[],
            labs=[],
            free_text_notes=raw_text
        )
