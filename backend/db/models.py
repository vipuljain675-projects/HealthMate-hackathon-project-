import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Date, DateTime, Boolean, ForeignKey, Text, Uuid
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()
Base.__allow_unmapped__ = True


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    auth_user_id = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True)
    auth_provider = Column(String, default="email")
    password_hash = Column(String, nullable=True)
    age = Column(String, default="28 Yrs")
    gender = Column(String, default="Male")
    phone_number = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    visits = relationship("Visit", back_populates="patient", cascade="all, delete-orphan")
    medications = relationship("Medication", back_populates="patient", cascade="all, delete-orphan")
    labs = relationship("Lab", back_populates="patient", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="patient", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")


class Visit(Base):
    __tablename__ = "visits"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(Uuid(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    date = Column(Date, nullable=False)
    hospital = Column(String)
    doctor_name = Column(String)
    reason = Column(String)
    diagnosis = Column(String)
    notes = Column(Text)
    original_file_url = Column(String)
    source_type = Column(String, default="manual_entry")
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="visits")
    medications = relationship("Medication", back_populates="visit")
    labs = relationship("Lab", back_populates="visit")


class Medication(Base):
    __tablename__ = "medications"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(Uuid(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    visit_id = Column(Uuid(as_uuid=True), ForeignKey("visits.id"), nullable=True)
    drug_name = Column(String, nullable=False)
    dosage = Column(String)
    frequency = Column(String)
    purpose = Column(String)
    duration_days = Column(String)
    notes = Column(Text)
    status = Column(String, default="active")
    started_on = Column(Date)

    patient = relationship("Patient", back_populates="medications")
    visit = relationship("Visit", back_populates="medications")
    reminders = relationship("Reminder", back_populates="medication")


class Lab(Base):
    __tablename__ = "labs"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(Uuid(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    visit_id = Column(Uuid(as_uuid=True), ForeignKey("visits.id"), nullable=True)
    test_name = Column(String, nullable=False)
    value = Column(String)
    flag = Column(String)
    date = Column(Date)

    patient = relationship("Patient", back_populates="labs")
    visit = relationship("Visit", back_populates="labs")


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(Uuid(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    medication_id = Column(Uuid(as_uuid=True), ForeignKey("medications.id"), nullable=True)
    medicine_name = Column(String, nullable=False)
    dosage = Column(String)
    time_of_day = Column(String)
    frequency = Column(String)
    notes = Column(Text)
    active = Column(Boolean, default=True)

    patient = relationship("Patient", back_populates="reminders")
    medication = relationship("Medication", back_populates="reminders")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(Uuid(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    doctor_name = Column(String)
    hospital = Column(String)
    appointment_date = Column(Date, nullable=False)
    appointment_time = Column(String)
    reason = Column(String)
    status = Column(String, default="upcoming")

    patient = relationship("Patient", back_populates="appointments")
