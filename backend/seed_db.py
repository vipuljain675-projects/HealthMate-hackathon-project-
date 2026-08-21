import os
import json
from datetime import date
from db.postgres_client import (
    init_db,
    SessionLocal,
    get_or_create_patient,
    create_visit,
    create_medication,
    create_lab,
    create_reminder,
    create_appointment
)
from db.vector_client import add_visit_note_embedding

SEED_FILE_PATH = "../data/sample_patients/patient_demo.json"


def seed_database():
    print("[Seed] Initializing DB schema...")
    init_db()

    if not os.path.exists(SEED_FILE_PATH):
        print(f"[Seed Error] Seed file not found at {SEED_FILE_PATH}")
        return

    with open(SEED_FILE_PATH, "r") as f:
        data = json.load(f)

    db = SessionLocal()
    try:
        auth_user_id = data.get("auth_user_id", "demo-patient-auth-id-123")
        name = data.get("name", "Rajesh Kumar")
        email = data.get("email", "rajesh.kumar@example.com")

        print(f"[Seed] Creating patient: {name} ({auth_user_id})...")
        patient = get_or_create_patient(db, auth_user_id=auth_user_id, name=name, email=email)

        # Clear old records for clean seed
        # Seed Visits
        for v_data in data.get("visits", []):
            visit_date = date.fromisoformat(v_data["date"])
            visit = create_visit(
                db,
                patient_id=patient.id,
                visit_date=visit_date,
                hospital=v_data.get("hospital"),
                doctor_name=v_data.get("doctor_name"),
                reason=v_data.get("reason"),
                diagnosis=v_data.get("diagnosis"),
                notes=v_data.get("notes"),
                original_file_url=v_data.get("original_file_url"),
                source_type=v_data.get("source_type", "manual_entry")
            )

            # Sync note to ChromaDB vector store
            if v_data.get("notes"):
                add_visit_note_embedding(
                    patient_id=patient.id,
                    visit_id=visit.id,
                    notes=v_data["notes"],
                    doctor_name=v_data.get("doctor_name"),
                    hospital=v_data.get("hospital"),
                    visit_date=v_data["date"]
                )

        # Seed Medications
        for m_data in data.get("medications", []):
            started_on = date.fromisoformat(m_data["started_on"]) if m_data.get("started_on") else date.today()
            create_medication(
                db,
                patient_id=patient.id,
                drug_name=m_data["drug_name"],
                dosage=m_data.get("dosage"),
                frequency=m_data.get("frequency"),
                purpose=m_data.get("purpose"),
                status=m_data.get("status", "active"),
                started_on=started_on
            )

        # Seed Labs
        for l_data in data.get("labs", []):
            lab_date = date.fromisoformat(l_data["date"]) if l_data.get("date") else date.today()
            create_lab(
                db,
                patient_id=patient.id,
                test_name=l_data["test_name"],
                value=l_data.get("value"),
                flag=l_data.get("flag", "normal"),
                lab_date=lab_date
            )

        # Seed Reminders
        for r_data in data.get("reminders", []):
            create_reminder(
                db,
                patient_id=patient.id,
                medicine_name=r_data["medicine_name"],
                dosage=r_data.get("dosage"),
                time_of_day=r_data.get("time_of_day", "08:00"),
                frequency=r_data.get("frequency", "daily")
            )

        # Seed Appointments
        for a_data in data.get("appointments", []):
            appt_date = date.fromisoformat(a_data["appointment_date"])
            create_appointment(
                db,
                patient_id=patient.id,
                doctor_name=a_data.get("doctor_name"),
                hospital=a_data.get("hospital"),
                appointment_date=appt_date,
                appointment_time=a_data.get("appointment_time", "09:00"),
                reason=a_data.get("reason")
            )

        print("[Seed] Successfully seeded patient history, visits, medications, labs, reminders, and ChromaDB vector embeddings! 🎉")

    except Exception as e:
        print(f"[Seed Error] {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
