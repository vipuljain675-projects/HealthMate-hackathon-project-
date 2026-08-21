from datetime import datetime
from db.postgres_client import SessionLocal
from db.models import Reminder
from notifications.notification_sender import send_web_push_notification


def check_due_medicine_reminders():
    """
    Background job triggered by APScheduler every minute.
    Checks for active reminders due around current HH:MM time.
    """
    now_time_str = datetime.now().strftime("%H:%M")
    db = SessionLocal()
    try:
        reminders = db.query(Reminder).filter(
            Reminder.active == True,
            Reminder.time_of_day == now_time_str
        ).all()

        if reminders:
            print(f"[ReminderScheduler] Found {len(reminders)} due medicine reminders at {now_time_str}")

        for r in reminders:
            title = f"💊 Medicine Reminder: {r.medicine_name}"
            body = f"It's time to take your {r.dosage or ''} dose of {r.medicine_name}."
            print(f"[ReminderScheduler Triggered] Patient {r.patient_id} -> {title} ({body})")

            # In production, fetch patient's web_push_subscription from DB
            mock_subscription = {"endpoint": "https://push.example.com", "keys": {}}
            send_web_push_notification(mock_subscription, title=title, body=body)

    except Exception as e:
        print(f"[ReminderScheduler Error] {e}")
    finally:
        db.close()
