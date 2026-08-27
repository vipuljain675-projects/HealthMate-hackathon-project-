import os
import json
import re
from dotenv import load_dotenv
from twilio.rest import Client
from typing import Dict, Optional

load_dotenv()

# Twilio WhatsApp Credentials
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886").strip()


def send_whatsapp_notification(
    to_phone: str, 
    body: str, 
    content_sid: Optional[str] = None, 
    content_variables: Optional[dict] = None
) -> bool:
    """Send a WhatsApp message via Twilio Sandbox API using either Content SID templates or freeform body."""
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        print(f"[WhatsApp Sandbox Console Fallback] 📱 To {to_phone}: {body} (SID: {content_sid}, Vars: {content_variables})")
        return True

    # Clean phone number to ensure it has whatsapp: prefix and country code
    phone = to_phone.strip()
    if not phone.startswith("whatsapp:"):
        if not phone.startswith("+"):
            phone = f"+{phone}"
        phone = f"whatsapp:{phone}"

    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        
        # If ContentSid is specified (e.g. for Sandbox restrictions to Indian / international numbers)
        if content_sid:
            message = client.messages.create(
                from_=TWILIO_WHATSAPP_NUMBER,
                content_sid=content_sid,
                content_variables=json.dumps(content_variables or {}),
                to=phone
            )
        else:
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
    """High-level helper: checks if the patient has a registered phone number, sends WhatsApp templates. Falls back to console."""
    patient_id_str = str(patient_id)
    try:
        from db.postgres_client import SessionLocal
        from db.models import Patient
        import uuid

        db = SessionLocal()
        patient = db.query(Patient).filter(Patient.id == uuid.UUID(patient_id_str)).first()
        db.close()

        if patient and patient.phone_number:
            # We have a phone number! Send via WhatsApp templates (due to Sandbox restrictions)
            # Both medicine and appointment reminders map to Twilio Sandbox approved "Appointment Reminders" template
            content_sid = "HXfe5ab5f00277942d4d4200328b4d403c"
            
            # Check if this is an appointment reminder
            is_appointment = "appointment" in title.lower() or (data and data.get("type") == "appointment")
            
            if is_appointment:
                # Regex parse: "Appointment with {doctor_name} at {hospital} at {appointment_time}"
                # e.g., "Appointment with Dr. Verma at Apollo Clinic at 14:30."
                match = re.search(r"Appointment with (.*?) at (.*?) at (.*?)\.?", body)
                if match:
                    doctor = match.group(1).strip()
                    location = match.group(2).strip()
                    time_val = match.group(3).strip()
                    var1 = doctor
                    var2 = f"{time_val} ({location})"
                else:
                    var1 = "your doctor"
                    var2 = body
            else:
                # For Medicine reminder
                # Extract medicine name and dosage
                # e.g. "Time to take your 1 Tablet dose of Paracetamol. Take after food."
                # We want var1 = "medicine [Name]", var2 = "[Time] (Dosage: [Dosage])"
                medicine_name = "your medicine"
                dosage_val = ""
                
                # Check for standard medicine fields
                if "dose of" in body:
                    parts = body.split("dose of")
                    if len(parts) > 1:
                        medicine_name = parts[1].split(".")[0].strip()
                    dosage_parts = parts[0].split("take your")
                    if len(dosage_parts) > 1:
                        dosage_val = dosage_parts[1].strip()
                
                # If parsed successfully
                if medicine_name != "your medicine":
                    var1 = f"medicine {medicine_name}"
                    var2 = f"scheduled time"
                    if dosage_val:
                        var2 += f" (Dosage: {dosage_val})"
                else:
                    var1 = title.replace("💊 Medicine Reminder:", "").strip()
                    var2 = body
            
            content_variables = {
                "1": var1,
                "2": var2
            }
            fallback_body = f"Your appointment is coming up on {var1} at {var2}"
            return send_whatsapp_notification(
                to_phone=patient.phone_number,
                body=fallback_body,
                content_sid=content_sid,
                content_variables=content_variables
            )

    except Exception as e:
        print(f"[Notification Helper Error] {e}")

    # Fallback to Console print if no phone number is registered
    print(f"[🔔 Console Fallback Alert] {title}: {body}")
    return True
