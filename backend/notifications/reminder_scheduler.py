from datetime import datetime, timezone, timedelta
from db.postgres_client import SessionLocal
from db.models import Reminder
from notifications.notification_sender import notify_patient


def check_due_medicine_reminders():
    """
    Background job triggered by APScheduler every minute.
    Checks for active reminders due at current IST HH:MM time and sends notifications.
    """
    # Convert UTC server time to Indian Standard Time (IST = UTC + 5:30)
    ist_now = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
    now_time_str = ist_now.strftime("%H:%M")
    
    db = SessionLocal()
    try:
        reminders = db.query(Reminder).filter(
            Reminder.active == True,
            Reminder.time_of_day == now_time_str
        ).all()

        if reminders:
            print(f"[ReminderScheduler] ⏰ {len(reminders)} reminder(s) due at IST {now_time_str}")

        for r in reminders:
            title = f"💊 Medicine Reminder: {r.medicine_name}"
            body = f"Time to take your {r.dosage or ''} dose of {r.medicine_name}. {'— ' + r.notes if r.notes else ''}"
            print(f"[ReminderScheduler] 🔔 Patient {r.patient_id} → {title}")
            notify_patient(
                patient_id=str(r.patient_id),
                title=title,
                body=body.strip(" —"),
                data={"type": "medicine_reminder", "reminder_id": str(r.id)}
            )

    except Exception as e:
        print(f"[ReminderScheduler Error] {e}")
    finally:
        db.close()
