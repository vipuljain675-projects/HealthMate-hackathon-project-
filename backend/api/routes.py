import uuid
import re
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
    get_patient_appointments,
    auto_sync_reminders_from_medications
)
from db.models import Patient
from db.vector_client import add_visit_note_embedding, add_lab_results_embedding, add_medication_embedding
from auth.verify_supabase_token import verify_supabase_token
from ingestion.ocr_extractor import extract_text_from_image, clean_ocr_text
from ingestion.entity_structurer import parse_raw_text_to_entities
from ingestion.file_storage import upload_scan_file
from retrieval.structured_retriever import retrieve_structured_patient_facts
from generation.timeline_summarizer import generate_timeline_summary
from generation.qa_generator import answer_patient_question
from notifications.notification_sender import notify_patient

router = APIRouter(prefix="/api", tags=["Personal Health API"])


# ==========================================
# Pydantic Request / Response Schemas
# ==========================================
class MedicationItemSchema(BaseModel):
    drug_name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    purpose: Optional[str] = None
    duration_days: Optional[str] = None
    notes: Optional[str] = None
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


class AppointmentUpdateRequest(BaseModel):
    doctor_name: Optional[str] = None
    hospital: Optional[str] = None
    appointment_date: Optional[date] = None
    appointment_time: Optional[str] = None
    reason: Optional[str] = None
    status: Optional[str] = None



# ==========================================
# WhatsApp Notification Endpoints
# ==========================================
@router.post("/whatsapp-test")
def send_test_whatsapp(
    auth_user_id: str = Depends(verify_supabase_token),
    db: Session = Depends(get_db)
):
    """Sends an immediate test WhatsApp notification to verify the setup."""
    patient = get_or_create_patient(db, auth_user_id)
    success = notify_patient(
        patient_id=str(patient.id),
        title="🏥 HealthVault Test Notification",
        body="Your WhatsApp alerts are working! Medicine reminders will appear here.",
        data={"type": "test"}
    )
    return {"success": success, "message": "Test WhatsApp notification triggered!"}



class LoginRequest(BaseModel):
    email: str
    password: str


class SignUpRequest(BaseModel):
    name: str
    email: str
    password: str
    age: Optional[str] = None
    gender: Optional[str] = None


import hashlib


def hash_password(password: str) -> str:
    if not password or password == "google_oauth_protected":
        return "$oauth$google_protected_identity"
    salted = f"healthvault_salt_{password}_2026"
    return f"$pbkdf2_sha256${hashlib.sha256(salted.encode()).hexdigest()[:32]}"


@router.post("/auth/signup")
def signup_patient(payload: SignUpRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    if not email_clean:
        raise HTTPException(status_code=400, detail="Email address is required")

    existing = db.query(Patient).filter(Patient.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="An account with this email already exists! Please switch to 'Sign In / Login' tab to log in."
        )

    stable_key = re.sub(r'[^a-z0-9]', '_', email_clean)
    auth_user_id = f"user_{stable_key}"

    patient = Patient(
        auth_user_id=auth_user_id,
        name=payload.name.strip() if payload.name else "New Patient",
        email=email_clean,
        auth_provider="email" if payload.password != "google_oauth_protected" else "google",
        password_hash=hash_password(payload.password),
        age=payload.age or "28 Yrs",
        gender=payload.gender or "Male"
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    return {
        "status": "success",
        "message": "Account created successfully",
        "auth_token": auth_user_id,
        "patient": {
            "id": str(patient.id),
            "name": patient.name,
            "email": patient.email,
            "auth_provider": patient.auth_provider,
            "password_hash": patient.password_hash,
            "age": patient.age,
            "gender": patient.gender
        }
    }


@router.post("/auth/login")
def login_patient(payload: LoginRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    if not email_clean:
        raise HTTPException(status_code=400, detail="Email address is required")

    existing = db.query(Patient).filter(Patient.email == email_clean).first()
    if not existing:
        raise HTTPException(
            status_code=404,
            detail=f"No account found for '{email_clean}'. Please click 'Sign Up' tab to create your account first!"
        )

    # Update password hash if not set
    if not existing.password_hash or existing.password_hash == "$oauth$google_protected_identity":
        existing.password_hash = hash_password(payload.password)
        db.commit()

    return {
        "status": "success",
        "message": "Authenticated successfully",
        "auth_token": existing.auth_user_id,
        "patient": {
            "id": str(existing.id),
            "name": existing.name,
            "email": existing.email,
            "auth_provider": existing.auth_provider or "email",
            "password_hash": existing.password_hash,
            "age": existing.age or "28 Yrs",
            "gender": existing.gender or "Male"
        }
    }


class UserProfileUpdateRequest(BaseModel):
    name: str
    email: Optional[str] = None
    auth_provider: Optional[str] = "email"
    age: Optional[str] = "28 Yrs"
    gender: Optional[str] = "Male"
    phone_number: Optional[str] = None


# ==========================================
# Patient Profile Endpoints
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
        "auth_provider": patient.auth_provider or "email",
        "password_hash": patient.password_hash,
        "age": patient.age or "28 Yrs",
        "gender": patient.gender or "Male",
        "phone_number": patient.phone_number,
        "created_at": str(patient.created_at)
    }


@router.post("/me")
def update_current_patient_profile(
    payload: UserProfileUpdateRequest,
    auth_user_id: str = Depends(verify_supabase_token),
    db: Session = Depends(get_db)
):
    patient = get_or_create_patient(
        db,
        auth_user_id,
        name=payload.name,
        email=payload.email,
        auth_provider=payload.auth_provider,
        age=payload.age,
        gender=payload.gender,
        phone_number=payload.phone_number
    )
    if payload.name and payload.name not in ["Patient Profile", "Rajesh Kumar"]:
        patient.name = payload.name
    if payload.email and not payload.email.endswith("@example.com"):
        patient.email = payload.email
    if payload.auth_provider:
        patient.auth_provider = payload.auth_provider
    if payload.age:
        patient.age = payload.age
    if payload.gender:
        patient.gender = payload.gender
    if payload.phone_number is not None:
        patient.phone_number = payload.phone_number

    db.commit()
    db.refresh(patient)
    return {
        "id": str(patient.id),
        "auth_user_id": patient.auth_user_id,
        "name": patient.name,
        "email": patient.email,
        "auth_provider": patient.auth_provider or "email",
        "age": patient.age or "28 Yrs",
        "gender": patient.gender or "Male",
        "phone_number": patient.phone_number
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
            "duration_days": m.duration_days,
            "notes": m.notes,
            "status": m.status,
            "started_on": str(m.started_on) if m.started_on else None,
            "visit_id": str(m.visit_id) if m.visit_id else None
        }
        for m in meds
    ]

class MedicationCreatePayload(BaseModel):
    drug_name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    purpose: Optional[str] = None
    duration_days: Optional[str] = None
    notes: Optional[str] = None
    status: str = "active"
    started_on: Optional[date] = None


@router.post("/medications")
def add_medication_directly(
    payload: MedicationCreatePayload,
    auth_user_id: str = Depends(verify_supabase_token),
    db: Session = Depends(get_db)
):
    if not payload.drug_name or not payload.drug_name.strip():
        raise HTTPException(status_code=400, detail="Drug name is required.")

    patient = get_or_create_patient(db, auth_user_id)
    start_dt = payload.started_on or date.today()

    med = create_medication(
        db,
        patient_id=patient.id,
        drug_name=payload.drug_name.strip(),
        dosage=payload.dosage,
        frequency=payload.frequency,
        purpose=payload.purpose,
        duration_days=payload.duration_days,
        notes=payload.notes,
        status=payload.status,
        started_on=start_dt
    )

    # Embed into ChromaDB vector store so AI Chatbot instantly knows about this new medicine!
    med_dict = [{
        "drug_name": med.drug_name,
        "dosage": med.dosage or "",
        "frequency": med.frequency or "",
        "purpose": med.purpose or "",
        "duration_days": med.duration_days or ""
    }]
    add_medication_embedding(
        patient_id=patient.id,
        visit_id=med.id,
        medications=med_dict,
        doctor_name="Doctor Direct Advice",
        hospital="Manual Entry",
        visit_date=str(start_dt)
    )

    return {
        "status": "success",
        "message": "Medication added successfully",
        "medication": {
            "id": str(med.id),
            "drug_name": med.drug_name,
            "dosage": med.dosage,
            "frequency": med.frequency,
            "purpose": med.purpose,
            "duration_days": med.duration_days,
            "notes": med.notes,
            "status": med.status,
            "started_on": str(med.started_on) if med.started_on else None
        }
    }



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
            duration_days=med.duration_days,
            notes=med.notes,
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

    # 4. Sync into ChromaDB vector store
    if payload.notes:
        add_visit_note_embedding(
            patient_id=patient.id,
            visit_id=visit.id,
            notes=payload.notes,
            doctor_name=payload.doctor_name,
            hospital=payload.hospital,
            visit_date=str(payload.date)
        )

    # 4b. Lab results embedding
    if created_labs:
        lab_dicts = [
            {"test_name": l.test_name, "value": l.value, "flag": l.flag}
            for l in created_labs
        ]
        add_lab_results_embedding(
            patient_id=patient.id,
            visit_id=visit.id,
            labs=lab_dicts,
            doctor_name=payload.doctor_name,
            hospital=payload.hospital,
            visit_date=str(payload.date)
        )

    # 4c. Medications embedding
    if created_meds:
        med_dicts = [
            {"drug_name": m.drug_name, "dosage": m.dosage, "frequency": m.frequency, "purpose": m.purpose, "duration_days": m.duration_days}
            for m in created_meds
        ]
        add_medication_embedding(
            patient_id=patient.id,
            visit_id=visit.id,
            medications=med_dicts,
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

    # 4. Check if identical visit already exists for patient to prevent duplicates
    raw_notes = structured_data.free_text_notes or structured_data.visit.notes or raw_ocr_text
    clean_notes = clean_ocr_text(raw_notes)
    doc_type = getattr(structured_data.visit, 'document_type', 'prescription') or 'prescription'

    from db.models import Visit, Medication, Lab

    # Include source_type/doc_type in duplicate check so a lab report and prescription
    # from the same hospital on the same date don't collide
    existing_visit = db.query(Visit).filter(
        Visit.patient_id == patient.id,
        Visit.date == visit_date,
        Visit.doctor_name == structured_data.visit.doctor_name,
        Visit.hospital == structured_data.visit.hospital,
        Visit.source_type == f"scan_{doc_type}"
    ).first()

    if existing_visit:
        visit = existing_visit
        visit.diagnosis = structured_data.visit.diagnosis or visit.diagnosis
        visit.reason = structured_data.visit.reason or visit.reason
        visit.notes = clean_notes or visit.notes
        visit.original_file_url = file_url or visit.original_file_url
        db.commit()
    else:
        visit = create_visit(
            db,
            patient_id=patient.id,
            visit_date=visit_date,
            hospital=structured_data.visit.hospital,
            doctor_name=structured_data.visit.doctor_name,
            reason=structured_data.visit.reason,
            diagnosis=structured_data.visit.diagnosis,
            notes=clean_notes,
            original_file_url=file_url,
            source_type=f"scan_{doc_type}"
        )

    # 5. Save Medications in SQL with deduplication
    created_meds = []
    for med in structured_data.medications:
        existing_med = db.query(Medication).filter(
            Medication.patient_id == patient.id,
            Medication.drug_name == med.drug_name
        ).first()

        if existing_med:
            existing_med.dosage = med.dosage or existing_med.dosage
            existing_med.frequency = med.frequency or existing_med.frequency
            existing_med.duration_days = getattr(med, "duration_days", None) or existing_med.duration_days
            existing_med.purpose = med.purpose or existing_med.purpose
            existing_med.status = med.status
            existing_med.visit_id = visit.id  # Link to latest visit
            db.commit()
            created_meds.append(existing_med)
        else:
            m = create_medication(
                db,
                patient_id=patient.id,
                visit_id=visit.id,
                drug_name=med.drug_name,
                dosage=med.dosage,
                frequency=med.frequency,
                purpose=med.purpose,
                duration_days=getattr(med, "duration_days", None),
                status=med.status,
                started_on=visit_date
            )
            created_meds.append(m)

    # 6. Save Labs in SQL with deduplication per visit
    created_labs = []
    for lab in structured_data.labs:
        # Deduplicate labs by test_name within the same visit
        existing_lab = db.query(Lab).filter(
            Lab.patient_id == patient.id,
            Lab.visit_id == visit.id,
            Lab.test_name == lab.test_name
        ).first()

        if existing_lab:
            existing_lab.value = lab.value or existing_lab.value
            existing_lab.flag = lab.flag or existing_lab.flag
            db.commit()
            created_labs.append(existing_lab)
        else:
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

    # 7. Sync into ChromaDB vector store — create MULTIPLE embeddings for rich search
    # 7a. Visit notes embedding (clinical narrative)
    note_to_embed = clean_ocr_text(structured_data.free_text_notes or raw_ocr_text)
    if note_to_embed:
        add_visit_note_embedding(
            patient_id=patient.id,
            visit_id=visit.id,
            notes=note_to_embed,
            doctor_name=structured_data.visit.doctor_name,
            hospital=structured_data.visit.hospital,
            visit_date=str(visit_date)
        )

    # 7b. Lab results embedding (structured lab data → searchable text)
    if created_labs:
        lab_dicts = [
            {
                "test_name": getattr(l, 'test_name', '') if hasattr(l, 'test_name') else l.get('test_name', ''),
                "value": getattr(l, 'value', '') if hasattr(l, 'value') else l.get('value', ''),
                "flag": getattr(l, 'flag', 'normal') if hasattr(l, 'flag') else l.get('flag', 'normal'),
            }
            for l in created_labs
        ]
        add_lab_results_embedding(
            patient_id=patient.id,
            visit_id=visit.id,
            labs=lab_dicts,
            doctor_name=structured_data.visit.doctor_name,
            hospital=structured_data.visit.hospital,
            visit_date=str(visit_date)
        )

    # 7c. Medications embedding (structured med data → searchable text)
    if created_meds:
        med_dicts = [
            {
                "drug_name": getattr(m, 'drug_name', '') if hasattr(m, 'drug_name') else m.get('drug_name', ''),
                "dosage": getattr(m, 'dosage', '') if hasattr(m, 'dosage') else m.get('dosage', ''),
                "frequency": getattr(m, 'frequency', '') if hasattr(m, 'frequency') else m.get('frequency', ''),
                "purpose": getattr(m, 'purpose', '') if hasattr(m, 'purpose') else m.get('purpose', ''),
                "duration_days": getattr(m, 'duration_days', '') if hasattr(m, 'duration_days') else m.get('duration_days', ''),
            }
            for m in created_meds
        ]
        add_medication_embedding(
            patient_id=patient.id,
            visit_id=visit.id,
            medications=med_dicts,
            doctor_name=structured_data.visit.doctor_name,
            hospital=structured_data.visit.hospital,
            visit_date=str(visit_date)
        )

    # 8. Auto-generate Alarm Reminders for extracted medications
    if created_meds:
        try:
            auto_sync_reminders_from_medications(db, patient.id)
            print(f"[OCR Ingestion] ✅ Auto-synced medicine alarms for patient {patient.id}")
        except Exception as ex:
            print(f"[OCR Reminders Sync Warning] {ex}")

    return {

        "status": "success",
        "message": "OCR document processed and ingested successfully",
        "file_url": file_url,
        "visit_id": str(visit.id),
        "document_type": doc_type,
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
    if not reminders:
        reminders = auto_sync_reminders_from_medications(db, patient.id)
    return [
        {
            "id": str(r.id),
            "medicine_name": r.medicine_name,
            "dosage": r.dosage,
            "time_of_day": r.time_of_day,
            "frequency": r.frequency,
            "notes": r.notes,
            "active": r.active
        }
        for r in reminders
    ]


@router.post("/reminders/auto-sync")
def sync_reminders_from_prescriptions(
    auth_user_id: str = Depends(verify_supabase_token),
    db: Session = Depends(get_db)
):
    patient = get_or_create_patient(db, auth_user_id)
    reminders = auto_sync_reminders_from_medications(db, patient.id)
    return [
        {
            "id": str(r.id),
            "medicine_name": r.medicine_name,
            "dosage": r.dosage,
            "time_of_day": r.time_of_day,
            "frequency": r.frequency,
            "notes": r.notes,
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


# ==========================================
# Medication CRUD — Edit & Delete
# ==========================================
class MedicationUpdateRequest(BaseModel):
    drug_name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    purpose: Optional[str] = None
    duration_days: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


@router.put("/medications/{medication_id}")
def update_medication(
    medication_id: str,
    payload: MedicationUpdateRequest,
    auth_user_id: str = Depends(verify_supabase_token),
    db: Session = Depends(get_db)
):
    patient = get_or_create_patient(db, auth_user_id)
    from db.models import Medication
    med = db.query(Medication).filter(
        Medication.id == uuid.UUID(medication_id),
        Medication.patient_id == patient.id
    ).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    if payload.drug_name is not None: med.drug_name = payload.drug_name
    if payload.dosage is not None: med.dosage = payload.dosage
    if payload.frequency is not None: med.frequency = payload.frequency
    if payload.purpose is not None: med.purpose = payload.purpose
    if payload.duration_days is not None: med.duration_days = payload.duration_days
    if payload.notes is not None: med.notes = payload.notes
    if payload.status is not None: med.status = payload.status

    db.commit()
    db.refresh(med)
    return {
        "id": str(med.id), "drug_name": med.drug_name, "dosage": med.dosage,
        "frequency": med.frequency, "purpose": med.purpose, "duration_days": med.duration_days,
        "notes": med.notes, "status": med.status,
        "started_on": str(med.started_on) if med.started_on else None
    }


@router.delete("/medications/{medication_id}")
def delete_medication(
    medication_id: str,
    auth_user_id: str = Depends(verify_supabase_token),
    db: Session = Depends(get_db)
):
    patient = get_or_create_patient(db, auth_user_id)
    from db.models import Medication
    med = db.query(Medication).filter(
        Medication.id == uuid.UUID(medication_id),
        Medication.patient_id == patient.id
    ).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    db.delete(med)
    db.commit()
    return {"status": "deleted", "medication_id": medication_id}


# ==========================================
# Reminder CRUD — Edit, Toggle & Delete
# ==========================================
class ReminderUpdateRequest(BaseModel):
    medicine_name: Optional[str] = None
    dosage: Optional[str] = None
    time_of_day: Optional[str] = None
    frequency: Optional[str] = None
    notes: Optional[str] = None
    active: Optional[bool] = None


@router.put("/reminders/{reminder_id}")
def update_reminder(
    reminder_id: str,
    payload: ReminderUpdateRequest,
    auth_user_id: str = Depends(verify_supabase_token),
    db: Session = Depends(get_db)
):
    patient = get_or_create_patient(db, auth_user_id)
    from db.models import Reminder
    r = db.query(Reminder).filter(
        Reminder.id == uuid.UUID(reminder_id),
        Reminder.patient_id == patient.id
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reminder not found")

    if payload.medicine_name is not None: r.medicine_name = payload.medicine_name
    if payload.dosage is not None: r.dosage = payload.dosage
    if payload.time_of_day is not None: r.time_of_day = payload.time_of_day
    if payload.frequency is not None: r.frequency = payload.frequency
    if payload.notes is not None: r.notes = payload.notes
    if payload.active is not None: r.active = payload.active

    db.commit()
    db.refresh(r)
    return {
        "id": str(r.id), "medicine_name": r.medicine_name, "dosage": r.dosage,
        "time_of_day": r.time_of_day, "frequency": r.frequency,
        "notes": r.notes, "active": r.active
    }


@router.delete("/reminders/{reminder_id}")
def delete_reminder(
    reminder_id: str,
    auth_user_id: str = Depends(verify_supabase_token),
    db: Session = Depends(get_db)
):
    patient = get_or_create_patient(db, auth_user_id)
    from db.models import Reminder
    r = db.query(Reminder).filter(
        Reminder.id == uuid.UUID(reminder_id),
        Reminder.patient_id == patient.id
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reminder not found")
    db.delete(r)
    db.commit()
    return {"status": "deleted", "reminder_id": reminder_id}


@router.put("/appointments/{appointment_id}")
def update_appointment(
    appointment_id: str,
    payload: AppointmentUpdateRequest,
    auth_user_id: str = Depends(verify_supabase_token),
    db: Session = Depends(get_db)
):
    patient = get_or_create_patient(db, auth_user_id)
    from db.models import Appointment
    a = db.query(Appointment).filter(
        Appointment.id == uuid.UUID(appointment_id),
        Appointment.patient_id == patient.id
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if payload.doctor_name is not None: a.doctor_name = payload.doctor_name
    if payload.hospital is not None: a.hospital = payload.hospital
    if payload.appointment_date is not None: a.appointment_date = payload.appointment_date
    if payload.appointment_time is not None: a.appointment_time = payload.appointment_time
    if payload.reason is not None: a.reason = payload.reason
    if payload.status is not None: a.status = payload.status

    db.commit()
    db.refresh(a)
    return {
        "id": str(a.id),
        "doctor_name": a.doctor_name,
        "hospital": a.hospital,
        "appointment_date": str(a.appointment_date),
        "appointment_time": a.appointment_time,
        "reason": a.reason,
        "status": a.status
    }


@router.delete("/appointments/{appointment_id}")
def delete_appointment(
    appointment_id: str,
    auth_user_id: str = Depends(verify_supabase_token),
    db: Session = Depends(get_db)
):
    patient = get_or_create_patient(db, auth_user_id)
    from db.models import Appointment
    a = db.query(Appointment).filter(
        Appointment.id == uuid.UUID(appointment_id),
        Appointment.patient_id == patient.id
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Appointment not found")
    db.delete(a)
    db.commit()
    return {"status": "deleted", "appointment_id": appointment_id}

