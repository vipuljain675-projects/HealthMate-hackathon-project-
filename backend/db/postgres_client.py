import os
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.engine import Engine
from db.models import Base, Patient, Visit, Medication, Lab, Reminder, Appointment

load_dotenv()

DEFAULT_SUPABASE_DB = "postgresql://postgres.kywqmkjnavtbpkiarwxt:blPkjDpNbSWh4Qt1@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require"
raw_db_url = (os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DATABASE_URL") or DEFAULT_SUPABASE_DB).strip()

if raw_db_url.startswith("postgres://"):
    raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)

if "sslmode=require" not in raw_db_url and "?" not in raw_db_url:
    raw_db_url = f"{raw_db_url}?sslmode=require"

# Auto-correct wrong pooler region if injected via Render environment variables
if "kywqmkjnavtbpkiarwxt" in raw_db_url and "pooler.supabase.com" in raw_db_url:
    import re
    raw_db_url = re.sub(r"aws-0-[a-z0-9-]+\.pooler\.supabase\.com", "aws-0-ap-northeast-2.pooler.supabase.com", raw_db_url)

engine: Engine = create_engine(raw_db_url, pool_pre_ping=True, pool_size=5, max_overflow=10)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from sqlalchemy import text

def init_db():
    """Initialize online Supabase PostgreSQL database tables & auto-migrate missing columns."""
    Base.metadata.create_all(bind=engine)
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS auth_provider VARCHAR DEFAULT 'email';"))
            conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS password_hash VARCHAR;"))
            conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS age VARCHAR DEFAULT '28 Yrs';"))
            conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS gender VARCHAR DEFAULT 'Male';"))
            conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone_number VARCHAR;"))
            conn.commit()
    except Exception as e:
        print(f"[Database Migration Note] {e}")
    print("[Database] Connected to online Supabase PostgreSQL database successfully & schema updated.")


def get_db():
    """FastAPI Dependency for database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_or_create_patient(
    db: Session,
    auth_user_id: str,
    name: Optional[str] = None,
    email: Optional[str] = None,
    auth_provider: Optional[str] = None,
    age: Optional[str] = "28 Yrs",
    gender: Optional[str] = "Male",
    phone_number: Optional[str] = None
) -> Patient:
    # 1. Primary Lookup by unique auth_user_id
    patient = db.query(Patient).filter(Patient.auth_user_id == auth_user_id).first()

    # Determine clean email for this user
    if email and email.strip() and "@example.com" not in email:
        clean_email = email.strip().lower()
    elif patient and patient.email:
        clean_email = patient.email
    else:
        safe_key = re.sub(r'[^a-z0-9]', '_', auth_user_id.lower())
        clean_email = f"{safe_key}@patient.healthmate.app"

    # Determine clean name for this user
    if name and name.strip() and name.strip() not in ["Patient Profile", "demo-patient-auth-id-123"]:
        clean_name = name.strip()
    elif patient and patient.name:
        clean_name = patient.name
    else:
        clean_name = clean_email.split('@')[0].replace('_', ' ').replace('.', ' ').title()

    real_provider = auth_provider or (patient.auth_provider if patient else ("google" if "google" in auth_user_id else "email"))
    real_password_hash = "$oauth$google_protected_identity" if real_provider == "google" else "$pbkdf2_sha256$8f9d0c1e2a3b4c5d6e7f8a9b0c1d2e3f"

    # 2. Secondary Lookup by email if not found by auth_user_id
    if not patient and clean_email:
        patient = db.query(Patient).filter(Patient.email == clean_email).first()
        if patient:
            patient.auth_user_id = auth_user_id

    # 3. Create if still not found
    if not patient:
        patient = Patient(
            id=uuid.uuid4(),
            auth_user_id=auth_user_id,
            name=clean_name,
            email=clean_email,
            auth_provider=real_provider,
            password_hash=real_password_hash,
            age=age or "28 Yrs",
            gender=gender or "Male",
            phone_number=phone_number
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)
    else:
        # Update ONLY if explicit parameters are passed
        if name and name.strip() and name.strip() != "Patient Profile":
            patient.name = name.strip()
        if email and email.strip() and "@example.com" not in email:
            patient.email = email.strip().lower()
        if auth_provider:
            patient.auth_provider = auth_provider
        if age:
            patient.age = age
        if gender:
            patient.gender = gender
        if phone_number is not None:
            patient.phone_number = phone_number
        db.commit()
        db.refresh(patient)

    return patient


def get_patient_by_auth_id(db: Session, auth_user_id: str) -> Optional[Patient]:
    return db.query(Patient).filter(Patient.auth_user_id == auth_user_id).first()


# ==========================================
# Visit Operations
# ==========================================
def create_visit(
    db: Session,
    patient_id: uuid.UUID,
    visit_date: date,
    hospital: Optional[str] = None,
    doctor_name: Optional[str] = None,
    reason: Optional[str] = None,
    diagnosis: Optional[str] = None,
    notes: Optional[str] = None,
    original_file_url: Optional[str] = None,
    source_type: str = "manual_entry"
) -> Visit:
    visit = Visit(
        id=uuid.uuid4(),
        patient_id=patient_id,
        date=visit_date,
        hospital=hospital,
        doctor_name=doctor_name,
        reason=reason,
        diagnosis=diagnosis,
        notes=notes,
        original_file_url=original_file_url,
        source_type=source_type
    )
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return visit


def get_patient_visits(
    db: Session,
    patient_id: uuid.UUID,
    hospital: Optional[str] = None,
    doctor_name: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> List[Visit]:
    query = db.query(Visit).filter(Visit.patient_id == patient_id)

    if hospital:
        query = query.filter(Visit.hospital.ilike(f"%{hospital}%"))
    if doctor_name:
        query = query.filter(Visit.doctor_name.ilike(f"%{doctor_name}%"))
    if start_date:
        query = query.filter(Visit.date >= start_date)
    if end_date:
        query = query.filter(Visit.date <= end_date)

    return query.order_by(Visit.date.desc()).all()


# ==========================================
# Medication Operations
# ==========================================
def create_medication(
    db: Session,
    patient_id: uuid.UUID,
    drug_name: str,
    dosage: Optional[str] = None,
    frequency: Optional[str] = None,
    purpose: Optional[str] = None,
    duration_days: Optional[str] = None,
    notes: Optional[str] = None,
    status: str = "active",
    started_on: Optional[date] = None,
    visit_id: Optional[uuid.UUID] = None
) -> Medication:
    med = Medication(
        id=uuid.uuid4(),
        patient_id=patient_id,
        visit_id=visit_id,
        drug_name=drug_name,
        dosage=dosage,
        frequency=frequency,
        purpose=purpose,
        duration_days=duration_days,
        notes=notes,
        status=status,
        started_on=started_on or date.today()
    )
    db.add(med)
    db.commit()
    db.refresh(med)
    return med


def get_patient_medications(db: Session, patient_id: uuid.UUID, status: Optional[str] = None) -> List[Medication]:
    query = db.query(Medication).filter(Medication.patient_id == patient_id)
    if status:
        query = query.filter(Medication.status == status)
    return query.order_by(Medication.started_on.desc()).all()


# ==========================================
# Lab Operations
# ==========================================
def create_lab(
    db: Session,
    patient_id: uuid.UUID,
    test_name: str,
    value: Optional[str] = None,
    flag: Optional[str] = None,
    lab_date: Optional[date] = None,
    visit_id: Optional[uuid.UUID] = None
) -> Lab:
    lab = Lab(
        id=uuid.uuid4(),
        patient_id=patient_id,
        visit_id=visit_id,
        test_name=test_name,
        value=value,
        flag=flag,
        date=lab_date or date.today()
    )
    db.add(lab)
    db.commit()
    db.refresh(lab)
    return lab


def get_patient_labs(db: Session, patient_id: uuid.UUID) -> List[Lab]:
    return db.query(Lab).filter(Lab.patient_id == patient_id).order_by(Lab.date.desc()).all()


# ==========================================
# Reminder Operations
# ==========================================
def create_reminder(
    db: Session,
    patient_id: uuid.UUID,
    medicine_name: str,
    dosage: Optional[str] = None,
    time_of_day: str = "08:00",
    frequency: str = "daily",
    notes: Optional[str] = None,
    medication_id: Optional[uuid.UUID] = None
) -> Reminder:
    reminder = Reminder(
        id=uuid.uuid4(),
        patient_id=patient_id,
        medication_id=medication_id,
        medicine_name=medicine_name,
        dosage=dosage,
        time_of_day=time_of_day,
        frequency=frequency,
        notes=notes,
        active=True
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


def get_patient_reminders(db: Session, patient_id: uuid.UUID, active_only: bool = True) -> List[Reminder]:
    query = db.query(Reminder).filter(Reminder.patient_id == patient_id)
    if active_only:
        query = query.filter(Reminder.active == True)
    return query.all()


def auto_sync_reminders_from_medications(db: Session, patient_id: uuid.UUID) -> List[Reminder]:
    """
    Parses active medications for a patient, infers standard alarm schedules based on:
    - Frequency (e.g. "once daily", "twice daily", "three times daily")
    - Clinical Meal/Time Directives (e.g. "after lunch", "bedtime", "after breakfast", "before dinner")
    and automatically creates Reminder records if they don't already exist.
    """
    meds = db.query(Medication).filter(
        Medication.patient_id == patient_id,
        Medication.status == "active"
    ).all()

    created_reminders = []

    for med in meds:
        text_to_parse = f"{(med.frequency or '')} {(med.notes or '')} {(med.purpose or '')}".lower()
        times_with_notes = []

        # Check for specific meal/time directives first
        if "bed" in text_to_parse or "night" in text_to_parse or "hs" in text_to_parse or "sleep" in text_to_parse:
            times_with_notes.append(("22:00", "Take at bedtime"))

        if "lunch" in text_to_parse:
            if "before" in text_to_parse:
                times_with_notes.append(("13:00", "Take 30m before lunch"))
            else:
                times_with_notes.append(("14:30", "Take after lunch"))

        if "breakfast" in text_to_parse or "morning" in text_to_parse:
            if "before" in text_to_parse or "empty" in text_to_parse:
                times_with_notes.append(("07:30", "Take on empty stomach before breakfast"))
            else:
                times_with_notes.append(("09:00", "Take after breakfast"))

        if "dinner" in text_to_parse:
            if "before" in text_to_parse:
                times_with_notes.append(("19:30", "Take before dinner"))
            else:
                times_with_notes.append(("21:00", "Take after dinner"))

        # If no specific meal directive was found, fall back to standard frequency schedules
        if not times_with_notes:
            freq_str = text_to_parse
            if "three" in freq_str or "thrice" in freq_str or "3" in freq_str or "tds" in freq_str or "tid" in freq_str:
                times_with_notes = [("08:00", "Morning dose"), ("14:00", "Afternoon dose"), ("20:00", "Evening dose")]
            elif "twice" in freq_str or "two" in freq_str or "2" in freq_str or "bd" in freq_str or "bid" in freq_str:
                times_with_notes = [("08:00", "Morning dose"), ("20:00", "Evening dose")]
            elif "four" in freq_str or "4" in freq_str or "qds" in freq_str or "qid" in freq_str:
                times_with_notes = [("08:00", "8:00 AM"), ("12:00", "12:00 PM"), ("16:00", "4:00 PM"), ("20:00", "8:00 PM")]
            elif "once" in freq_str or "1" in freq_str or "od" in freq_str or "daily" in freq_str:
                times_with_notes = [("08:00", "Daily dose")]
            else:
                times_with_notes = [("09:00", "Scheduled dose")]

        for t, note_text in times_with_notes:
            existing = db.query(Reminder).filter(
                Reminder.patient_id == patient_id,
                Reminder.medicine_name.ilike(med.drug_name),
                Reminder.time_of_day == t
            ).first()

            if not existing:
                full_notes = f"{note_text} ({med.purpose or 'prescription'})" if med.purpose else note_text
                r = Reminder(
                    id=uuid.uuid4(),
                    patient_id=patient_id,
                    medication_id=med.id,
                    medicine_name=med.drug_name,
                    dosage=med.dosage,
                    time_of_day=t,
                    frequency=med.frequency or "daily",
                    notes=full_notes,
                    active=True
                )
                db.add(r)
                created_reminders.append(r)

    if created_reminders:
        db.commit()

    return get_patient_reminders(db, patient_id)




# ==========================================
# Appointment Operations
# ==========================================
def create_appointment(
    db: Session,
    patient_id: uuid.UUID,
    doctor_name: Optional[str],
    hospital: Optional[str],
    appointment_date: date,
    appointment_time: Optional[str] = None,
    reason: Optional[str] = None
) -> Appointment:
    appt = Appointment(
        id=uuid.uuid4(),
        patient_id=patient_id,
        doctor_name=doctor_name,
        hospital=hospital,
        appointment_date=appointment_date,
        appointment_time=appointment_time or "09:00",
        reason=reason,
        status="upcoming"
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return appt


def get_patient_appointments(db: Session, patient_id: uuid.UUID, status: Optional[str] = None) -> List[Appointment]:
    query = db.query(Appointment).filter(Appointment.patient_id == patient_id)
    if status:
        query = query.filter(Appointment.status == status)
    return query.order_by(Appointment.appointment_date.asc()).all()
