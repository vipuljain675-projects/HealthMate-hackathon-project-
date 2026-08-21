import uuid
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db.postgres_client import (
    get_db,
    get_or_create_patient,
    create_visit,
    create_medication,
    create_lab,
    create_reminder,
    create_appointment,
    get_patient_visits,
    get_patient_medications,
    get_patient_labs,
    get_patient_reminders,
    get_patient_appointments
)
from db.vector_client import add_visit_note_embedding
from auth.verify_supabase_token import verify_supabase_token
from ingestion.ocr_extractor import extract_text_from_image
from ingestion.entity_structurer import parse_raw_text_to_entities
from ingestion.file_storage import upload_scan_file
from retrieval.structured_retriever import retrieve_structured_patient_facts
from generation.timeline_summarizer import generate_timeline_summary
from generation.qa_generator import answer_patient_question

router = APIRouter(prefix="/api", tags=["Personal Health API"])


# ==========================================
# Pydantic Request / Response Schemas
# ==========================================
class MedicationItemSchema(BaseModel):
    drug_name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    purpose: Optional[str] = None
    status: str = "active"


class LabItemSchema(BaseModel):
    test_name: str
    value: Optional[str] = None
    flag: Optional[str] = "normal"


class ManualEntryRequest(BaseModel):
    date: date
    hospital: Optional[str] = None
    doctor_name: Optional[str] = None
    reason: Optional[str] = None
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    medications: List[MedicationItemSchema] = Field(default_factory=list)
    labs: List[LabItemSchema] = Field(default_factory=list)


class AskQuestionRequest(BaseModel):
    question: str


class ReminderCreateRequest(BaseModel):
    medicine_name: str
    dosage: Optional[str] = None
    time_of_day: str = "08:00"
    frequency: str = "daily"


class AppointmentCreateRequest(BaseModel):
    doctor_name: Optional[str] = None
    hospital: Optional[str] = None
    appointment_date: date
    appointment_time: Optional[str] = "09:00"
    reason: Optional[str] = None


# ==========================================
# Patient Profile Endpoint
# ==========================================
@router.get("/me")
def get_current_patient_profile(
    auth_user_id: str = Depends(verify_supabase_token),
    db: Session = Depends(get_db)
):
    patient = get_or_create_patient(db, auth_user_id)
    return {
        "id": str(patient.id),
        "auth_user_id": patient.auth_user_id,
        "name": patient.name,
        "email": patient.email,
        "created_at": str(patient.created_at)
    }


# ==========================================
# Timeline View Endpoint
# ==========================================
@router.get("/timeline")
def get_health_timeline(
    auth_user_id: str = Depends(verify_supabase_token),
    db: Session = Depends(get_db)
):
    patient = get_or_create_patient(db, auth_user_id)
    structured_facts = retrieve_structured_patient_facts(db, patient.id)
    summary_text = generate_timeline_summary(patient.name, structured_facts)

    return {
        "patient": {"id": str(patient.id), "name": patient.name},
        "summary": summary_text,
        "timeline_events": structured_facts
    }


# ==========================================
# Medications Endpoint
# ==========================================
@router.get("/medications")
def list_medications(
    status: Optional[str] = None,
    auth_user_id: str = Depends(verify_supabase_token),
    db: Session = Depends(get_db)
):
    patient = get_or_create_patient(db, auth_user_id)
    meds = get_patient_medications(db, patient.id, status=status)
    return [
        {
            "id": str(m.id),
            "drug_name": m.drug_name,
            "dosage": m.dosage,
            "frequency": m.frequency,
            "purpose": m.purpose,
            "status": m.status,
            "started_on": str(m.started_on) if m.started_on else None,
            "visit_id": str(m.visit_id) if m.visit_id else None
        }
        for m in meds
    ]


# ==========================================
# Entry Ingestion: Manual Clinical Form
# ==========================================
@router.post("/entry/manual")
def create_manual_entry(
    payload: ManualEntryRequest,
    auth_user_id: str = Depends(verify_supabase_token),
    db: Session = Depends(get_db)
):
    patient = get_or_create_patient(db, auth_user_id)

    # 1. Save Visit into SQL
    visit = create_visit(
        db,
        patient_id=patient.id,
        visit_date=payload.date,
        hospital=payload.hospital,
        doctor_name=payload.doctor_name,
        reason=payload.reason,
        diagnosis=payload.diagnosis,
        notes=payload.notes,
        source_type="manual_entry"
    )

    # 2. Save Medications into SQL
    created_meds = []
    for med in payload.medications:
        m = create_medication(
            db,
            patient_id=patient.id,
            visit_id=visit.id,
            drug_name=med.drug_name,
            dosage=med.dosage,
            frequency=med.frequency,
            purpose=med.purpose,
            status=med.status,
            started_on=payload.date
        )
        created_meds.append(m)

    # 3. Save Labs into SQL
    created_labs = []
    for lab in payload.labs:
        l = create_lab(
            db,
            patient_id=patient.id,
            visit_id=visit.id,
            test_name=lab.test_name,
            value=lab.value,
            flag=lab.flag,
            lab_date=payload.date
        )
        created_labs.append(l)

    # 4. Sync free-text notes into ChromaDB vector store
    if payload.notes:
        add_visit_note_embedding(
            patient_id=patient.id,
            visit_id=visit.id,
            notes=payload.notes,
            doctor_name=payload.doctor_name,
            hospital=payload.hospital,
            visit_date=str(payload.date)
        )

    return {
        "status": "success",
        "message": "Manual clinical record created successfully",
        "visit_id": str(visit.id),
        "medications_count": len(created_meds),
        "labs_count": len(created_labs)
    }


# ==========================================
# Entry Ingestion: OCR Scan Upload
# ==========================================
@router.post("/entry/ocr")
async def process_ocr_scan_upload(
    file: UploadFile = File(...),
    auth_user_id: str = Depends(verify_supabase_token),
    db: Session = Depends(get_db)
):
    patient = get_or_create_patient(db, auth_user_id)

    # Read bytes and file type
    file_bytes = await file.read()
    content_type = file.content_type or "image/jpeg"

    # 1. Upload scan file to Supabase Storage / local
    file_url = upload_scan_file(file_bytes, file.filename or "scan.jpg", content_type)

    # 2. Extract text using Groq Vision OCR
    raw_ocr_text = extract_text_from_image(file_bytes, content_type)

    # 3. Parse text into structured entities via LLM
    structured_data = parse_raw_text_to_entities(raw_ocr_text)

    # Convert date string YYYY-MM-DD
    try:
        visit_date = date.fromisoformat(structured_data.visit.date)
    except Exception:
        visit_date = date.today()

    # 4. Save Visit in SQL with original_file_url
    visit = create_visit(
        db,
        patient_id=patient.id,
        visit_date=visit_date,
        hospital=structured_data.visit.hospital,
        doctor_name=structured_data.visit.doctor_name,
        reason=structured_data.visit.reason,
        diagnosis=structured_data.visit.diagnosis,
        notes=structured_data.free_text_notes or structured_data.visit.notes,
        original_file_url=file_url,
        source_type="scan"
    )

    # 5. Save Medications in SQL
    created_meds = []
    for med in structured_data.medications:
        m = create_medication(
            db,
            patient_id=patient.id,
            visit_id=visit.id,
            drug_name=med.drug_name,
            dosage=med.dosage,
            frequency=med.frequency,
            purpose=med.purpose,
            status=med.status,
            started_on=visit_date
        )
        created_meds.append(m)

    # 6. Save Labs in SQL
    created_labs = []
    for lab in structured_data.labs:
        l = create_lab(
            db,
            patient_id=patient.id,
            visit_id=visit.id,
            test_name=lab.test_name,
            value=lab.value,
            flag=lab.flag,
            lab_date=visit_date
        )
        created_labs.append(l)

    # 7. Sync free-text notes into ChromaDB vector store
    note_to_embed = structured_data.free_text_notes or raw_ocr_text
    if note_to_embed:
        add_visit_note_embedding(
            patient_id=patient.id,
            visit_id=visit.id,
            notes=note_to_embed,
            doctor_name=structured_data.visit.doctor_name,
            hospital=structured_data.visit.hospital,
            visit_date=str(visit_date)
        )

    return {
        "status": "success",
        "message": "OCR document processed and ingested successfully",
        "file_url": file_url,
        "visit_id": str(visit.id),
        "raw_text_snippet": raw_ocr_text[:300],
        "extracted_entities": {
            "visit": structured_data.visit.model_dump(),
            "medications_count": len(created_meds),
            "labs_count": len(created_labs)
        }
    }


# ==========================================
# Reminders Endpoints
# ==========================================
@router.get("/reminders")
def list_reminders(
    auth_user_id: str = Depends(verify_supabase_token),
    db: Session = Depends(get_db)
):
    patient = get_or_create_patient(db, auth_user_id)
    reminders = get_patient_reminders(db, patient.id)
    return [
        {
            "id": str(r.id),
            "medicine_name": r.medicine_name,
            "dosage": r.dosage,
            "time_of_day": r.time_of_day,
            "frequency": r.frequency,
            "active": r.active
        }
        for r in reminders
    ]


@router.post("/reminders")
def add_reminder(
    payload: ReminderCreateRequest,
    auth_user_id: str = Depends(verify_supabase_token),
    db: Session = Depends(get_db)
):
    patient = get_or_create_patient(db, auth_user_id)
    reminder = create_reminder(
        db,
        patient_id=patient.id,
        medicine_name=payload.medicine_name,
        dosage=payload.dosage,
        time_of_day=payload.time_of_day,
        frequency=payload.frequency
    )
    return {"status": "success", "reminder_id": str(reminder.id)}


# ==========================================
# Appointments Endpoints
# ==========================================
@router.get("/appointments")
def list_appointments(
    auth_user_id: str = Depends(verify_supabase_token),
    db: Session = Depends(get_db)
):
    patient = get_or_create_patient(db, auth_user_id)
    appts = get_patient_appointments(db, patient.id)
    return [
        {
            "id": str(a.id),
            "doctor_name": a.doctor_name,
            "hospital": a.hospital,
            "appointment_date": str(a.appointment_date),
            "appointment_time": a.appointment_time,
            "reason": a.reason,
            "status": a.status
        }
        for a in appts
    ]


@router.post("/appointments")
def add_appointment(
    payload: AppointmentCreateRequest,
    auth_user_id: str = Depends(verify_supabase_token),
    db: Session = Depends(get_db)
):
    patient = get_or_create_patient(db, auth_user_id)
    appt = create_appointment(
        db,
        patient_id=patient.id,
        doctor_name=payload.doctor_name,
        hospital=payload.hospital,
        appointment_date=payload.appointment_date,
        appointment_time=payload.appointment_time,
        reason=payload.reason
    )
    return {"status": "success", "appointment_id": str(appt.id)}


# ==========================================
# RAG Health Assistant Q&A Endpoint
# ==========================================
@router.post("/ask")
def ask_health_assistant(
    payload: AskQuestionRequest,
    auth_user_id: str = Depends(verify_supabase_token),
    db: Session = Depends(get_db)
):
    if not payload.question or not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    patient = get_or_create_patient(db, auth_user_id)
    result = answer_patient_question(
        db,
        patient_id=patient.id,
        patient_name=patient.name,
        user_question=payload.question.strip()
    )
    return result
