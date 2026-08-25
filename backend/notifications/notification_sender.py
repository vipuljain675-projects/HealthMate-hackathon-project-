import os
import json
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

raw_priv = os.getenv("VAPID_PRIVATE_KEY", "").strip()
VAPID_PRIVATE_KEY = raw_priv.replace("\\n", "\n").strip("\"'")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "").strip().strip("\"'")
VAPID_CLAIMS_SUB = os.getenv("VAPID_CLAIMS_SUB", "mailto:admin@healthvault.app").strip()


_push_subscriptions: Dict[str, Dict] = {}


def save_push_subscription(patient_id: str, subscription: Dict[str, Any]):
    """Save or update a browser push subscription in PostgreSQL DB + RAM."""
    patient_id_str = str(patient_id)
    _push_subscriptions[patient_id_str] = subscription

    endpoint = subscription.get("endpoint", "")
    keys = subscription.get("keys", {})
    p256dh = keys.get("p256dh", "")
    auth = keys.get("auth", "")

    if not endpoint or not p256dh or not auth:
        print(f"[WebPush] Invalid subscription payload for patient {patient_id_str}")
        return

    try:
        from db.postgres_client import SessionLocal
        from db.models import PushSubscription
        from datetime import datetime

        db = SessionLocal()
        existing = db.query(PushSubscription).filter(
            PushSubscription.patient_id == patient_id_str
        ).first()

        if existing:
            existing.endpoint = endpoint
            existing.p256dh = p256dh
            existing.auth = auth
            existing.updated_at = datetime.utcnow()
        else:
            sub_rec = PushSubscription(
                patient_id=patient_id_str,
                endpoint=endpoint,
                p256dh=p256dh,
                auth=auth
            )
            db.add(sub_rec)

        db.commit()
        db.close()
        print(f"[WebPush] ✅ Saved push subscription in DB for patient {patient_id_str}")
    except Exception as e:
        print(f"[WebPush DB Save Error] {e}")


def get_push_subscription(patient_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve stored push subscription for a patient from RAM or PostgreSQL DB."""
    patient_id_str = str(patient_id)
    if patient_id_str in _push_subscriptions:
        return _push_subscriptions[patient_id_str]

    try:
        from db.postgres_client import SessionLocal
        from db.models import PushSubscription

        db = SessionLocal()
        sub_rec = db.query(PushSubscription).filter(
            PushSubscription.patient_id == patient_id_str
        ).order_by(PushSubscription.updated_at.desc()).first()
        db.close()

        if sub_rec:
            sub = {
                "endpoint": sub_rec.endpoint,
                "keys": {
                    "p256dh": sub_rec.p256dh,
                    "auth": sub_rec.auth
                }
            }
            _push_subscriptions[patient_id_str] = sub
            return sub
    except Exception as e:
        print(f"[WebPush DB Fetch Error] {e}")

    return None



def send_web_push_notification(
    subscription_info: Dict[str, Any],
    title: str,
    body: str,
    icon: str = "/icon.png",
    data: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Sends a Web Push notification to a target user browser subscription.
    Falls back to console log if VAPID keys not configured.
    """
    payload = json.dumps({
        "title": title,
        "body": body,
        "icon": icon,
        "data": data or {}
    })

    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        print(f"[WebPush Console Notification] 🔔 {title}: {body}")
        return True

    if not subscription_info or not subscription_info.get("endpoint"):
        print(f"[WebPush] No valid subscription endpoint — console fallback: {title}")
        return True

    try:
        from pywebpush import webpush, WebPushException

        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_CLAIMS_SUB}
        )
        print(f"[WebPush Sent] ✅ Delivered: '{title}'")
        return True

    except Exception as e:
        print(f"[WebPush Error] ❌ Failed: {e}")
        return False


def notify_patient(patient_id: str, title: str, body: str, data: Optional[Dict] = None) -> bool:
    """High-level helper: look up subscription and send push to a patient."""
    subscription = get_push_subscription(str(patient_id))
    if not subscription:
        print(f"[WebPush] No subscription found for patient {patient_id} — console fallback.")
        print(f"[🔔 Console Notification] {title}: {body}")
        return True
    return send_web_push_notification(subscription, title=title, body=body, data=data)
