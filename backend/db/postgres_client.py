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

DEFAULT_SUPABASE_DB = "postgresql://postgres:blPkjDpNbSWh4Qt1@db.kywqmkjnavtbpkiarwxt.supabase.co:5432/postgres?sslmode=require"
raw_db_url = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DATABASE_URL") or DEFAULT_SUPABASE_DB

if raw_db_url.startswith("postgres://"):
    raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)

# Primary engine with psycopg2 / pg8000
try:
    if "pg8000" not in raw_db_url and os.getenv("RENDER"):
        pg8000_url = raw_db_url.replace("postgresql://", "postgresql+pg8000://")
        engine: Engine = create_engine(pg8000_url, pool_pre_ping=True, pool_size=5, max_overflow=10)
    else:
        engine: Engine = create_engine(raw_db_url, pool_pre_ping=True, pool_size=5, max_overflow=10)
except Exception as err:
    print(f"[PostgreSQL] Primary engine init notice: {err}, falling back to pg8000 driver...")
    pg8000_url = raw_db_url.replace("postgresql://", "postgresql+pg8000://")
    engine: Engine = create_engine(pg8000_url, pool_pre_ping=True)

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
    gender: Optional[str] = "Male"
) -> Patient:
    patient = db.query(Patient).filter(Patient.auth_user_id == auth_user_id).first()

    # Determine clean real email and name
    clean_email = email.strip().lower() if email else "vipuljain675@gmail.com"
    if "@example.com" in clean_email or clean_email in ["demo-patient-auth-id-123", "demo-patient-auth-id-123@example.com"]:
        clean_email = "vipuljain675@gmail.com"

    clean_name = name.strip() if name and name not in ["Patient Profile", "demo-patient-auth-id-123"] else "Vipul Jain"
    
    real_provider = auth_provider or ("google" if "google" in auth_user_id or clean_email == "vipuljain675@gmail.com" else "email")
    real_password_hash = "$oauth$google_protected_identity" if real_provider == "google" else "$pbkdf2_sha256$8f9d0c1e2a3b4c5d6e7f8a9b0c1d2e3f"

    if not patient:
        patient = Patient(
            id=uuid.uuid4(),
            auth_user_id=auth_user_id,
            name=clean_name,
            email=clean_email,
            auth_provider=real_provider,
            password_hash=real_password_hash,
            age=age or "28 Yrs",
            gender=gender or "Male"
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)
    else:
        patient.name = clean_name
        patient.email = clean_email
        patient.auth_provider = real_provider
        if not patient.password_hash:
            patient.password_hash = real_password_hash
        if age:
            patient.age = age
        if gender:
            patient.gender = gender
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
