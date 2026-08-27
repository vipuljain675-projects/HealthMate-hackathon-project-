import uuid
from datetime import datetime, date
from typing import Any, List, Optional
from sqlalchemy import Column, String, Date, DateTime, Boolean, ForeignKey, Text, Uuid
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Patient(Base):
    __tablename__ = "patients"

    id: Any = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    auth_user_id: Any = Column(String, unique=True, nullable=False, index=True)
    name: Any = Column(String, nullable=False)
    email: Any = Column(String, unique=True)
    auth_provider: Any = Column(String, default="email")
    password_hash: Any = Column(String, nullable=True)
    age: Any = Column(String, default="28 Yrs")
    gender: Any = Column(String, default="Male")
    phone_number: Any = Column(String, nullable=True)
    created_at: Any = Column(DateTime, default=datetime.utcnow)

    # Relationships
    visits: Any = relationship("Visit", back_populates="patient", cascade="all, delete-orphan")
    medications: Any = relationship("Medication", back_populates="patient", cascade="all, delete-orphan")
    labs: Any = relationship("Lab", back_populates="patient", cascade="all, delete-orphan")
    reminders: Any = relationship("Reminder", back_populates="patient", cascade="all, delete-orphan")
    appointments: Any = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")


class Visit(Base):
    __tablename__ = "visits"

    id: Any = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Any = Column(Uuid(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    date: Any = Column(Date, nullable=False)
    hospital: Any = Column(String)
    doctor_name: Any = Column(String)
    reason: Any = Column(String)
    diagnosis: Any = Column(String)
    notes: Any = Column(Text)
    original_file_url: Any = Column(String)
    source_type: Any = Column(String, default="manual_entry")
    created_at: Any = Column(DateTime, default=datetime.utcnow)

    patient: Any = relationship("Patient", back_populates="visits")
    medications: Any = relationship("Medication", back_populates="visit")
    labs: Any = relationship("Lab", back_populates="visit")


class Medication(Base):
    __tablename__ = "medications"

    id: Any = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Any = Column(Uuid(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    visit_id: Any = Column(Uuid(as_uuid=True), ForeignKey("visits.id"), nullable=True)
    drug_name: Any = Column(String, nullable=False)
    dosage: Any = Column(String)
    frequency: Any = Column(String)
    purpose: Any = Column(String)
    duration_days: Any = Column(String)
    notes: Any = Column(Text)
    status: Any = Column(String, default="active")
    started_on: Any = Column(Date)

    patient: Any = relationship("Patient", back_populates="medications")
    visit: Any = relationship("Visit", back_populates="medications")
    reminders: Any = relationship("Reminder", back_populates="reminders")


class Lab(Base):
    __tablename__ = "labs"

    id: Any = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Any = Column(Uuid(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    visit_id: Any = Column(Uuid(as_uuid=True), ForeignKey("visits.id"), nullable=True)
    test_name: Any = Column(String, nullable=False)
    value: Any = Column(String)
    flag: Any = Column(String)
    date: Any = Column(Date)

    patient: Any = relationship("Patient", back_populates="labs")
    visit: Any = relationship("Visit", back_populates="labs")


class Reminder(Base):
    __tablename__ = "reminders"

    id: Any = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Any = Column(Uuid(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    medication_id: Any = Column(Uuid(as_uuid=True), ForeignKey("medications.id"), nullable=True)
    medicine_name: Any = Column(String, nullable=False)
    dosage: Any = Column(String)
    time_of_day: Any = Column(String)
    frequency: Any = Column(String)
    notes: Any = Column(Text)
    active: Any = Column(Boolean, default=True)

    patient: Any = relationship("Patient", back_populates="reminders")
    medication: Any = relationship("Medication", back_populates="reminders")


class Appointment(Base):
    __tablename__ = "appointments"

    id: Any = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Any = Column(Uuid(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    doctor_name: Any = Column(String)
    hospital: Any = Column(String)
    appointment_date: Any = Column(Date, nullable=False)
    appointment_time: Any = Column(String)
    reason: Any = Column(String)
    status: Any = Column(String, default="upcoming")

    patient: Any = relationship("Patient", back_populates="appointments")
