import os
import json
from typing import List, Optional
from datetime import date
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


class ExtractedMedication(BaseModel):
    drug_name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    purpose: Optional[str] = None
    status: str = "active"


class ExtractedLab(BaseModel):
    test_name: str
    value: Optional[str] = None
    flag: Optional[str] = "normal"  # "normal", "elevated", "low"


class ExtractedVisit(BaseModel):
    date: str  # YYYY-MM-DD
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
                ExtractedMedication(drug_name="Amlodipine", dosage="5mg", frequency="once daily", purpose="BP control"),
                ExtractedMedication(drug_name="Metformin", dosage="500mg", frequency="twice daily", purpose="Diabetes control")
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
            "You are a medical data extraction LLM. Your job is to extract structured JSON from raw clinical notes/OCR text.\n"
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
            '    {"drug_name": "Name", "dosage": "5mg", "frequency": "once daily", "purpose": "BP", "status": "active"}\n'
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
                {"role": "user", "content": f"Extract structured data from this raw clinical text:\n\n{raw_text}"}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )

        json_str = response.choices[0].message.content or "{}"
        parsed_dict = json.loads(json_str)
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
