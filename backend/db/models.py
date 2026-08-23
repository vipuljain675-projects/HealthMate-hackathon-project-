import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Date, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.dialects.postgresql import UUID

Base = declarative_base()


class Patient(Base):
    __tablename__ = "patients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    auth_user_id = Column(String, unique=True, nullable=False, index=True)  # links to Supabase auth.users
    name = Column(String, nullable=False)
    email = Column(String, unique=True)
    auth_provider = Column(String, default="email")      # "google", "email"
    password_hash = Column(String, nullable=True)        # secure hashed password
    age = Column(String, default="28 Yrs")
    gender = Column(String, default="Male")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    visits = relationship("Visit", back_populates="patient", cascade="all, delete-orphan")
    medications = relationship("Medication", back_populates="patient", cascade="all, delete-orphan")
    labs = relationship("Lab", back_populates="patient", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="patient", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")


class Visit(Base):
    __tablename__ = "visits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    date = Column(Date, nullable=False)
    hospital = Column(String)
    doctor_name = Column(String)
    reason = Column(String)              # "fever", "BP checkup"
    diagnosis = Column(String)
    notes = Column(Text)                 # free-text note — synced to ChromaDB vector store
    original_file_url = Column(String)   # scan Supabase Storage link if OCR sourced
    source_type = Column(String, default="manual_entry")  # "scan" or "manual_entry"
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="visits")
    medications = relationship("Medication", back_populates="visit")
    labs = relationship("Lab", back_populates="visit")


class Medication(Base):
    __tablename__ = "medications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    visit_id = Column(UUID(as_uuid=True), ForeignKey("visits.id"), nullable=True)
    drug_name = Column(String, nullable=False)
    dosage = Column(String)              # "5mg"
    frequency = Column(String)           # "once daily"
    purpose = Column(String)             # "for Hypertension"
    duration_days = Column(String)       # "30 days" / "30" — from prescription
    notes = Column(Text)                 # extra notes e.g. "take with food"
    status = Column(String, default="active")  # "active" or "discontinued"
    started_on = Column(Date)

    patient = relationship("Patient", back_populates="medications")
    visit = relationship("Visit", back_populates="medications")
    reminders = relationship("Reminder", back_populates="medication")


class Lab(Base):
    __tablename__ = "labs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    visit_id = Column(UUID(as_uuid=True), ForeignKey("visits.id"), nullable=True)
    test_name = Column(String, nullable=False)  # "Creatinine", "HbA1c"
    value = Column(String)               # "1.6 mg/dL"
    flag = Column(String)                # "normal" / "elevated" / "low"
    date = Column(Date)

    patient = relationship("Patient", back_populates="labs")
    visit = relationship("Visit", back_populates="labs")


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    medication_id = Column(UUID(as_uuid=True), ForeignKey("medications.id"), nullable=True)
    medicine_name = Column(String, nullable=False)
    dosage = Column(String)
    time_of_day = Column(String)         # "08:00"
    frequency = Column(String)           # "daily"
    notes = Column(Text)                 # e.g. "after breakfast"
    active = Column(Boolean, default=True)

    patient = relationship("Patient", back_populates="reminders")
    medication = relationship("Medication", back_populates="reminders")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    doctor_name = Column(String)
    hospital = Column(String)
    appointment_date = Column(Date, nullable=False)
    appointment_time = Column(String)     # "14:30"
    reason = Column(String)
    status = Column(String, default="upcoming")  # "upcoming" / "completed" / "cancelled"

    patient = relationship("Patient", back_populates="appointments")
