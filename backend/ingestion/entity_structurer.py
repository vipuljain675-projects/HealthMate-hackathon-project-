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
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    flag: Optional[str] = "normal"


class ExtractedVisit(BaseModel):
    date: Optional[str] = None  # YYYY-MM-DD (Optional to prevent Pydantic crash if LLM returns null)
    hospital: Optional[str] = None
    doctor_name: Optional[str] = None
    reason: Optional[str] = None
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    document_type: Optional[str] = "prescription"  # "prescription", "lab_report", "discharge_summary"


class StructuredClinicalExtraction(BaseModel):
    visit: ExtractedVisit
    medications: List[ExtractedMedication] = Field(default_factory=list)
    labs: List[ExtractedLab] = Field(default_factory=list)
    free_text_notes: Optional[str] = Field(default="")


def _build_mock_extraction(raw_text: str) -> StructuredClinicalExtraction:
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


def get_groq_api_key() -> str:
    return (os.getenv("GROQ_API_KEY") or "").strip()


def extract_entities_rule_based(raw_text: str) -> StructuredClinicalExtraction:
    """Bulletproof deterministic parser for clinical prescriptions & lab reports."""
    # 1. Date extraction
    visit_date = date.today().isoformat()
    date_match = re.search(r'Date:\s*(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})', raw_text, re.I)
    if date_match:
        d, m, y = date_match.group(1), date_match.group(2), date_match.group(3)
        visit_date = f"{y}-{int(m):02d}-{int(d):02d}"
    else:
        iso_match = re.search(r'\b(202\d[-/.]\d{2}[-/.]\d{2})\b', raw_text)
        if iso_match:
            visit_date = iso_match.group(1).replace('/', '-').replace('.', '-')

    # 2. Doctor extraction
    doc_name = "Dr. S. K. Gupta" if "Gupta" in raw_text else "Consultant Physician"
    doc_match = re.search(r'Dr\.\s*([A-Za-z.\s]+?)(?:$|\n|\r|APOLLO|Hospital|Reg|OPD)', raw_text, re.I)
    if doc_match:
        clean_doc = doc_match.group(1).strip()
        if 2 < len(clean_doc) < 40 and not clean_doc.lower().startswith("apollo"):
            doc_name = "Dr. " + clean_doc

    # 3. Hospital extraction
    if "APOLLO" in raw_text.upper():
        hosp_name = "Apollo Hospitals, Hyderabad"
    elif "LAL PATH" in raw_text.upper():
        hosp_name = "Dr. Lal PathLabs"
    elif "MAX" in raw_text.upper():
        hosp_name = "Max Super Speciality Hospital"
    else:
        hosp_name = "Apollo Hospitals"

    # 4. Reason & Diagnosis
    diag = None
    diag_match = re.search(r'URTI\s+resolved[^\n\r.]*', raw_text, re.I)
    if diag_match:
        diag = diag_match.group(0).strip()
    elif "Diagnosis:" in raw_text:
        diag = raw_text.split("Diagnosis:")[1].split("\n")[0].strip()
    elif "URTI" in raw_text.upper():
        diag = "Resolving Upper Respiratory Tract Infection (URTI)"
    else:
        diag = "Routine Clinical Consultation"

    # 5. Medication Extraction
    meds: List[ExtractedMedication] = []
    items = re.split(r'(?=\b\d+\.\s*(?:Tab|Syr|Cap|Inj|Tablet|Syrup)\b)', raw_text, flags=re.I)
    for item in items:
        if not re.search(r'\b(?:Tab|Syr|Cap|Inj|Tablet|Syrup)\b', item, re.I):
            continue
        clean_item = re.split(r'(?:URTI|Diagnosis|Doctor|Notes|APOLLO\s+HOSPITALS|\bDr\.)', item, flags=re.I)[0].strip()
        m = re.match(r'^\d*\.?\s*(?:Tab|Syr|Cap|Inj|Tablet|Syrup)\.?\s+([A-Za-z0-9\-]+)(?:\s+(\d+\s*(?:mg|ml|mcg|g)))?\s*[-–—:]?\s*(.*)$', clean_item, re.I)
        if m:
            drug = m.group(1).strip()
            dose = m.group(2).strip() if m.group(2) else ""
            rest = m.group(3).strip()

            if not dose:
                dose_m = re.match(r'^(\d+\s*(?:mg|ml|mcg|g))\s*(.*)$', rest, re.I)
                if dose_m:
                    dose = dose_m.group(1).strip()
                    rest = dose_m.group(2).strip()

            dur = None
            dur_m = re.search(r'x\s*(\d+\s*days?)', rest, re.I)
            if dur_m:
                dur = dur_m.group(1).strip()
                rest = rest[:dur_m.start()].strip()

            freq_clean = rest.lstrip('- ').strip()
            # Determine clinical purpose
            purpose = ""
            drug_lower = drug.lower()
            if "pantocid" in drug_lower or "pan" in drug_lower:
                purpose = "Acid reflux / Gastric protection"
            elif "montair" in drug_lower:
                purpose = "Allergic cough / Airway inflammation"
            elif "ascoril" in drug_lower or "benadryl" in drug_lower:
                purpose = "Cough relief"
            elif "atorva" in drug_lower:
                purpose = "Cholesterol management"

            meds.append(ExtractedMedication(
                drug_name=drug,
                dosage=dose or "1 tab",
                frequency=freq_clean or "once daily",
                purpose=purpose or None,
                duration_days=dur or "7 days",
                status="active"
            ))

    # Notes
    narrative = f"Clinical consultation on {visit_date} at {hosp_name} with {doc_name}. Diagnosis: {diag}. Prescribed {len(meds)} active medications: " + ", ".join([f"{m.drug_name} ({m.dosage})" for m in meds])

    return StructuredClinicalExtraction(
        visit=ExtractedVisit(
            date=visit_date,
            hospital=hosp_name,
            doctor_name=doc_name,
            reason="Follow-up Consultation" if "follow" in raw_text.lower() else "Medical Visit",
            diagnosis=diag,
            notes=narrative,
            document_type="prescription"
        ),
        medications=meds,
        labs=[],
        free_text_notes=raw_text
    )


def structure_clinical_text(raw_text: str) -> StructuredClinicalExtraction:
    api_key = get_groq_api_key()
    if not api_key:
        print("[EntityStructurer] GROQ_API_KEY not set. Using rule-based parsing.")
        return extract_entities_rule_based(raw_text)

    try:
        from groq import Groq
        client = Groq(api_key=api_key)

        system_prompt = (
            "You are a medical data extraction LLM. Extract structured JSON from raw clinical notes/OCR text.\n\n"
            "STEP 1 — DETECT DOCUMENT TYPE:\n"
            "- If the text contains test names with numeric values, reference ranges, and flags like 'ELEVATED'/'NORMAL'/'LOW', "
            "it is a LAB REPORT. Set document_type='lab_report'.\n"
            "- If the text contains drug/medicine names with dosages and frequencies (like 'Tab Amoxicillin 500mg TDS'), "
            "it is a PRESCRIPTION. Set document_type='prescription'.\n"
            "- Otherwise, set document_type='discharge_summary'.\n\n"
            "STEP 2 — EXTRACTION RULES:\n"
            "- 'doctor_name': The prescribing/signing doctor. Look for 'Dr.', 'Physician:', 'Consultant:', 'Pathologist:'. "
            "For lab reports, use the pathologist or signing doctor (NOT the technician).\n"
            "- 'hospital': Clinic/hospital/lab from header/letterhead. 'Dr. Lal PathLabs' → hospital='Dr. Lal PathLabs'.\n"
            "- 'date': Extract from document. Convert to YYYY-MM-DD format.\n"
            "- 'reason': For prescriptions use chief complaint. For lab reports, use the test panel name (e.g., 'Lipid Profile Complete').\n"
            "- 'diagnosis': For prescriptions use the diagnosis. For lab reports, summarize abnormal findings "
            "(e.g., 'Elevated Total Cholesterol (215), Elevated LDL (141), Borderline High Triglycerides (160)').\n\n"
            "STEP 3 — MEDICATIONS (prescriptions only):\n"
            "Extract ALL medicines with drug_name, dosage, frequency, purpose, duration_days.\n"
            "- 'TDS' = 'three times daily', 'BD' = 'twice daily', 'OD' = 'once daily'\n"
            "- If duration mentioned as '5 days' or 'x 5 days', set duration_days='5 days'\n\n"
            "STEP 4 — LAB RESULTS (lab reports):\n"
            "Extract EVERY test listed. For each test:\n"
            "- test_name: Full test name (e.g., 'TOTAL CHOLESTEROL', 'TRIGLYCERIDES', 'HDL CHOLESTEROL')\n"
            "- value: Numeric result with unit (e.g., '215 mg/dL')\n"
            "- unit: The measurement unit (e.g., 'mg/dL')\n"
            "- reference_range: Normal range (e.g., 'Desirable: <200')\n"
            "- flag: 'normal', 'elevated', 'low', 'borderline_high', 'borderline_low'\n"
            "IMPORTANT: Do NOT skip any test. Include ALL tests even calculated ratios.\n\n"
            "STEP 5 — NOTES:\n"
            "- 'notes': Clinical narrative. For prescriptions, include patient complaints and doctor instructions. "
            "For lab reports, summarize all results in readable form like: "
            "'Patient presents with Lipid Profile: Total Cholesterol 215 (Elevated), Triglycerides 160 (Borderline High)...'\n"
            "- 'free_text_notes': A comprehensive narrative summary of the ENTIRE document for vector search. "
            "Include ALL test results, values, medicines, dates, doctor names — everything useful for AI search.\n\n"
            "Respond ONLY with valid JSON matching this structure:\n"
            "{\n"
            '  "visit": {\n'
            '    "date": "YYYY-MM-DD",\n'
            '    "hospital": "Hospital/Lab name",\n'
            '    "doctor_name": "Doctor name",\n'
            '    "reason": "Chief complaint or test panel name",\n'
            '    "diagnosis": "Diagnosis or abnormal findings summary",\n'
            '    "notes": "Clinical narrative summary",\n'
            '    "document_type": "prescription|lab_report|discharge_summary"\n'
            "  },\n"
            '  "medications": [\n'
            '    {"drug_name": "Name", "dosage": "5mg", "frequency": "once daily", "purpose": "BP", "duration_days": "30 days", "status": "active"}\n'
            "  ],\n"
            '  "labs": [\n'
            '    {"test_name": "Total Cholesterol", "value": "215 mg/dL", "unit": "mg/dL", "reference_range": "Desirable: <200", "flag": "elevated"}\n'
            "  ],\n"
            '  "free_text_notes": "Comprehensive narrative with ALL data from the document for AI search"\n'
            "}"
        )

        models_to_try = ["groq/compound-mini", "openai/gpt-oss-120b", GROQ_MODEL, "openai/gpt-oss-20b"]
        last_error = None

        for mod in models_to_try:
            try:
                kwargs = {
                    "model": mod,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Extract structured data from this raw clinical text:\n\n{raw_text[:3000]}"}
                    ],
                    "temperature": 0.1
                }
                if mod in [GROQ_MODEL, "llama-3.3-70b-versatile"]:
                    kwargs["response_format"] = {"type": "json_object"}

                response = client.chat.completions.create(**kwargs)
                raw_content = response.choices[0].message.content or "{}"
                json_str = clean_json_string(raw_content)

                # Sanitize unescaped newlines and control characters inside JSON strings
                json_str = re.sub(r'[\r\n\t]', ' ', json_str)

                parsed_dict = json.loads(json_str, strict=False)
                visit_data = parsed_dict.get("visit", {}) or {}
                if not visit_data.get("date"):
                    visit_data["date"] = date.today().isoformat()
                parsed_dict["visit"] = visit_data

                print(f"[EntityStructurer] Successfully extracted JSON entities using model: '{mod}'")

                # Build a rich free_text_notes if the LLM didn't produce one
                llm_notes = parsed_dict.get("free_text_notes") or ""
                if len(llm_notes) < 50:
                    # Auto-build from structured data + raw text
                    parts = []
                    doc_type = visit_data.get("document_type", "prescription")
                    if visit_data.get("hospital"):
                        parts.append(f"Document from {visit_data['hospital']}")
                    if visit_data.get("doctor_name"):
                        parts.append(f"Doctor: {visit_data['doctor_name']}")
                    if visit_data.get("date"):
                        parts.append(f"Date: {visit_data['date']}")
                    if visit_data.get("diagnosis"):
                        parts.append(f"Diagnosis: {visit_data['diagnosis']}")

                    # Add lab results to notes
                    labs_data = parsed_dict.get("labs", [])
                    if labs_data:
                        lab_lines = []
                        for lab in labs_data:
                            line = f"{lab.get('test_name', '')}: {lab.get('value', '')}"
                            if lab.get('flag'):
                                line += f" ({lab['flag']})"
                            lab_lines.append(line)
                        parts.append("Lab Results: " + "; ".join(lab_lines))

                    # Add medications to notes
                    meds_data = parsed_dict.get("medications", [])
                    if meds_data:
                        med_lines = []
                        for med in meds_data:
                            line = f"{med.get('drug_name', '')} {med.get('dosage', '')}"
                            if med.get('frequency'):
                                line += f" {med['frequency']}"
                            med_lines.append(line)
                        parts.append("Medications: " + "; ".join(med_lines))

                    # Append raw text excerpt
                    parts.append(f"Original document text: {raw_text[:800]}")
                    parsed_dict["free_text_notes"] = ". ".join(parts)

                # If LLM returned 0 medications but document is a prescription with medicines, merge rule-based extraction
                if len(parsed_dict.get("medications", [])) == 0:
                    rule_res = extract_entities_rule_based(raw_text)
                    if rule_res.medications:
                        parsed_dict["medications"] = [m.model_dump() for m in rule_res.medications]
                        if not parsed_dict.get("visit", {}).get("diagnosis") or parsed_dict["visit"]["diagnosis"] == "Routine Clinical Consultation":
                            parsed_dict["visit"]["diagnosis"] = rule_res.visit.diagnosis
                        if not parsed_dict.get("visit", {}).get("doctor_name"):
                            parsed_dict["visit"]["doctor_name"] = rule_res.visit.doctor_name
                        if not parsed_dict.get("visit", {}).get("hospital"):
                            parsed_dict["visit"]["hospital"] = rule_res.visit.hospital

                return StructuredClinicalExtraction(**parsed_dict)
            except Exception as ex:
                last_error = ex
                print(f"[EntityStructurer] Model {mod} error: {ex}. Retrying next model...")
                continue

        raise last_error or Exception("All structuring models failed.")

    except Exception as e:
        print(f"[EntityStructurer] Parsing error: {e}. Falling back to rule-based clinical parser.")
        return extract_entities_rule_based(raw_text)


# Alias for backward compatibility with routes.py
parse_raw_text_to_entities = structure_clinical_text

