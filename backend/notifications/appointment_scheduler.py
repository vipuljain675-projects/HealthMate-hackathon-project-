from datetime import datetime, timezone, timedelta
from db.postgres_client import SessionLocal
from db.models import Appointment
from notifications.notification_sender import notify_patient


def check_upcoming_appointments():
    """
    Background job checking for appointments scheduled for tomorrow or today (IST).
    """
    ist_today = (datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)).date()
    tomorrow = ist_today + timedelta(days=1)

    db = SessionLocal()
    try:
        appts = db.query(Appointment).filter(
            Appointment.status == "upcoming",
            Appointment.appointment_date.in_([ist_today, tomorrow])
        ).all()

        if appts:
            print(f"[AppointmentScheduler] Found {len(appts)} upcoming appointments for {ist_today} / {tomorrow}")

        for a in appts:
            day_str = "Today" if a.appointment_date == ist_today else "Tomorrow"
            title = f"🗓️ Upcoming Appointment: {day_str}"
            body = f"Appointment with {a.doctor_name or 'Doctor'} at {a.hospital or 'Clinic'} at {a.appointment_time or 'scheduled time'}."
            print(f"[AppointmentScheduler Triggered] Patient {a.patient_id} -> {title} ({body})")

            notify_patient(patient_id=str(a.patient_id), title=title, body=body)

    except Exception as e:
        print(f"[AppointmentScheduler Error] {e}")
    finally:
        db.close()
