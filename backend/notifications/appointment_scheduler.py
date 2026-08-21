from datetime import date, timedelta
from db.postgres_client import SessionLocal
from db.models import Appointment
from notifications.notification_sender import send_web_push_notification


def check_upcoming_appointments():
    """
    Background job checking for appointments scheduled for tomorrow or today.
    """
    today = date.today()
    tomorrow = today + timedelta(days=1)

    db = SessionLocal()
    try:
        appts = db.query(Appointment).filter(
            Appointment.status == "upcoming",
            Appointment.appointment_date.in_([today, tomorrow])
        ).all()

        if appts:
            print(f"[AppointmentScheduler] Found {len(appts)} upcoming appointments for {today} / {tomorrow}")

        for a in appts:
            day_str = "Today" if a.appointment_date == today else "Tomorrow"
            title = f"🗓️ Upcoming Appointment: {day_str}"
            body = f"Appointment with {a.doctor_name or 'Doctor'} at {a.hospital or 'Clinic'} at {a.appointment_time or 'scheduled time'}."
            print(f"[AppointmentScheduler Triggered] Patient {a.patient_id} -> {title} ({body})")

            mock_subscription = {"endpoint": "https://push.example.com", "keys": {}}
            send_web_push_notification(mock_subscription, title=title, body=body)

    except Exception as e:
        print(f"[AppointmentScheduler Error] {e}")
    finally:
        db.close()
