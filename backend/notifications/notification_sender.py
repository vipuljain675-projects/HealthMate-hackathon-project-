import os
from dotenv import load_dotenv
from twilio.rest import Client
from typing import Dict, Optional

load_dotenv()

# Twilio WhatsApp Credentials
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886").strip()


def send_whatsapp_notification(to_phone: str, body: str) -> bool:
    """Send a WhatsApp message via Twilio Sandbox API."""
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        print(f"[WhatsApp Sandbox Console Fallback] 📱 To {to_phone}: {body}")
        return True

    # Clean phone number to ensure it has whatsapp: prefix and country code
    phone = to_phone.strip()
    if not phone.startswith("whatsapp:"):
        if not phone.startswith("+"):
            phone = f"+{phone}"
        phone = f"whatsapp:{phone}"

    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            from_=TWILIO_WHATSAPP_NUMBER,
            body=body,
            to=phone
        )
        print(f"[WhatsApp Sent] ✅ SID: {message.sid} to {phone}")
        return True
    except Exception as e:
        print(f"[WhatsApp Send Error] ❌ Failed to send message to {phone}: {e}")
        return False


def notify_patient(patient_id: str, title: str, body: str, data: Optional[Dict] = None) -> bool:
    """High-level helper: checks if the patient has a registered phone number, sends WhatsApp. Falls back to console."""
    patient_id_str = str(patient_id)
    try:
        from db.postgres_client import SessionLocal
        from db.models import Patient
        import uuid

        db = SessionLocal()
        patient = db.query(Patient).filter(Patient.id == uuid.UUID(patient_id_str)).first()
        db.close()

        if patient and patient.phone_number:
            # We have a phone number! Send via WhatsApp!
            whatsapp_body = f"🏥 *HealthVault Alert*\n\n* {title} *\n{body}"
            return send_whatsapp_notification(patient.phone_number, whatsapp_body)
    except Exception as e:
        print(f"[Notification Helper Error] {e}")

    # Fallback to Console print if no phone number is registered
    print(f"[🔔 Console Fallback Alert] {title}: {body}")
    return True
