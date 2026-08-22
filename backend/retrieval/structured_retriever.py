import uuid
from typing import Optional, Dict, Any, List
from datetime import date
from sqlalchemy.orm import Session
from db.postgres_client import (
    get_patient_visits,
    get_patient_medications,
    get_patient_labs,
    get_patient_appointments,
    get_patient_reminders
)


def retrieve_structured_patient_facts(
    db: Session,
    patient_id: uuid.UUID,
    hospital: Optional[str] = None,
    doctor_name: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> Dict[str, Any]:
    """
    Retrieves all structured SQL records for a patient matching optional filter constraints.
    """
    visits = get_patient_visits(
        db, patient_id, hospital=hospital, doctor_name=doctor_name, start_date=start_date, end_date=end_date
    )
    medications = get_patient_medications(db, patient_id)
    labs = get_patient_labs(db, patient_id)
    appointments = get_patient_appointments(db, patient_id)
    reminders = get_patient_reminders(db, patient_id)

    formatted_visits = [
        {
            "id": str(v.id),
            "date": str(v.date),
            "hospital": v.hospital,
            "doctor": v.doctor_name,
            "reason": v.reason,
            "diagnosis": v.diagnosis,
            "notes": v.notes,
            "original_file_url": v.original_file_url,
            "source_type": v.source_type,
            "labs": [
                {
                    "id": str(l.id),
                    "test_name": l.test_name,
                    "value": l.value,
                    "flag": l.flag
                }
                for l in labs if l.visit_id == v.id
            ],
            "medications": [
                {
                    "id": str(m.id),
                    "drug_name": m.drug_name,
                    "dosage": m.dosage,
                    "frequency": m.frequency
                }
                for m in medications if m.visit_id == v.id
            ]
        }
        for v in visits
    ]

    formatted_meds = [
        {
            "id": str(m.id),
            "drug_name": m.drug_name,
            "dosage": m.dosage,
            "frequency": m.frequency,
            "purpose": m.purpose,
            "status": m.status,
            "started_on": str(m.started_on) if m.started_on else None
        }
        for m in medications
    ]

    formatted_labs = [
        {
            "id": str(l.id),
            "test_name": l.test_name,
            "value": l.value,
            "flag": l.flag,
            "date": str(l.date) if l.date else None
        }
        for l in labs
    ]

    formatted_appts = [
        {
            "id": str(a.id),
            "doctor_name": a.doctor_name,
            "hospital": a.hospital,
            "appointment_date": str(a.appointment_date),
            "appointment_time": a.appointment_time,
            "reason": a.reason,
            "status": a.status
        }
        for a in appointments
    ]

    return {
        "visits": formatted_visits,
        "medications": formatted_meds,
        "labs": formatted_labs,
        "appointments": formatted_appts,
        "reminders_count": len(reminders)
    }
