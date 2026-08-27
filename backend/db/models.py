import uuid
from datetime import datetime, date
from typing import Any, List, Optional
from sqlalchemy import Column, String, Date, DateTime, Boolean, ForeignKey, Text, Uuid
from sqlalchemy.orm import declarative_base, relationship, Mapped

Base = declarative_base()


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[Any] = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    auth_user_id: Mapped[Any] = Column(String, unique=True, nullable=False, index=True)
    name: Mapped[Any] = Column(String, nullable=False)
    email: Mapped[Any] = Column(String, unique=True)
    auth_provider: Mapped[Any] = Column(String, default="email")
    password_hash: Mapped[Any] = Column(String, nullable=True)
    age: Mapped[Any] = Column(String, default="28 Yrs")
    gender: Mapped[Any] = Column(String, default="Male")
    phone_number: Mapped[Any] = Column(String, nullable=True)
    created_at: Mapped[Any] = Column(DateTime, default=datetime.utcnow)

    # Relationships
    visits: Mapped[List["Visit"]] = relationship("Visit", back_populates="patient", cascade="all, delete-orphan")
    medications: Mapped[List["Medication"]] = relationship("Medication", back_populates="patient", cascade="all, delete-orphan")
    labs: Mapped[List["Lab"]] = relationship("Lab", back_populates="patient", cascade="all, delete-orphan")
    reminders: Mapped[List["Reminder"]] = relationship("Reminder", back_populates="patient", cascade="all, delete-orphan")
    appointments: Mapped[List["Appointment"]] = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")


class Visit(Base):
    __tablename__ = "visits"

    id: Mapped[Any] = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[Any] = Column(Uuid(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    date: Mapped[Any] = Column(Date, nullable=False)
    hospital: Mapped[Any] = Column(String)
    doctor_name: Mapped[Any] = Column(String)
    reason: Mapped[Any] = Column(String)
    diagnosis: Mapped[Any] = Column(String)
    notes: Mapped[Any] = Column(Text)
    original_file_url: Mapped[Any] = Column(String)
    source_type: Mapped[Any] = Column(String, default="manual_entry")
    created_at: Mapped[Any] = Column(DateTime, default=datetime.utcnow)

    patient: Mapped[Any] = relationship("Patient", back_populates="visits")
    medications: Mapped[Any] = relationship("Medication", back_populates="visit")
    labs: Mapped[Any] = relationship("Lab", back_populates="visit")


class Medication(Base):
    __tablename__ = "medications"

    id: Mapped[Any] = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[Any] = Column(Uuid(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    visit_id: Mapped[Any] = Column(Uuid(as_uuid=True), ForeignKey("visits.id"), nullable=True)
    drug_name: Mapped[Any] = Column(String, nullable=False)
    dosage: Mapped[Any] = Column(String)
    frequency: Mapped[Any] = Column(String)
    purpose: Mapped[Any] = Column(String)
    duration_days: Mapped[Any] = Column(String)
    notes: Mapped[Any] = Column(Text)
    status: Mapped[Any] = Column(String, default="active")
    started_on: Mapped[Any] = Column(Date)

    patient: Mapped[Any] = relationship("Patient", back_populates="medications")
    visit: Mapped[Any] = relationship("Visit", back_populates="medications")
    reminders: Mapped[Any] = relationship("Reminder", back_populates="medication")


class Lab(Base):
    __tablename__ = "labs"

    id: Mapped[Any] = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[Any] = Column(Uuid(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    visit_id: Mapped[Any] = Column(Uuid(as_uuid=True), ForeignKey("visits.id"), nullable=True)
    test_name: Mapped[Any] = Column(String, nullable=False)
    value: Mapped[Any] = Column(String)
    flag: Mapped[Any] = Column(String)
    date: Mapped[Any] = Column(Date)

    patient: Mapped[Any] = relationship("Patient", back_populates="labs")
    visit: Mapped[Any] = relationship("Visit", back_populates="labs")


class Reminder(Base):
    __tablename__ = "reminders"

    id: Mapped[Any] = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[Any] = Column(Uuid(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    medication_id: Mapped[Any] = Column(Uuid(as_uuid=True), ForeignKey("medications.id"), nullable=True)
    medicine_name: Mapped[Any] = Column(String, nullable=False)
    dosage: Mapped[Any] = Column(String)
    time_of_day: Mapped[Any] = Column(String)
    frequency: Mapped[Any] = Column(String)
    notes: Mapped[Any] = Column(Text)
    active: Mapped[Any] = Column(Boolean, default=True)

    patient: Mapped[Any] = relationship("Patient", back_populates="reminders")
    medication: Mapped[Any] = relationship("Medication", back_populates="reminders")


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[Any] = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[Any] = Column(Uuid(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    doctor_name: Mapped[Any] = Column(String)
    hospital: Mapped[Any] = Column(String)
    appointment_date: Mapped[Any] = Column(Date, nullable=False)
    appointment_time: Mapped[Any] = Column(String)
    reason: Mapped[Any] = Column(String)
    status: Mapped[Any] = Column(String, default="upcoming")

    patient: Mapped[Any] = relationship("Patient", back_populates="appointments")
