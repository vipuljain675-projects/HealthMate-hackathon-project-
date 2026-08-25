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



_vapid_instance = None
if VAPID_PRIVATE_KEY:
    try:
        from pywebpush import Vapid
        _vapid_instance = Vapid.from_pem(VAPID_PRIVATE_KEY.encode('utf-8'))
    except Exception as ex:
        print(f"[WebPush VAPID Init Warning] {ex}")


def send_web_push_notification(
    subscription_info: Dict[str, Any],
    title: str,
    body: str,
    icon: str = "https://health-mate-hackathon-project.vercel.app/icon.png",
    data: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Sends a Web Push notification to a target user browser subscription.
    Falls back to console log if VAPID keys not configured.
    """
    payload = json.dumps({
        "title": title,
        "body": body,
        "icon": icon if icon.startswith("http") else f"https://health-mate-hackathon-project.vercel.app{icon}",
        "data": data or {}
    })


    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        print(f"[WebPush Console Notification] 🔔 {title}: {body}")
        return True

    if not subscription_info or not subscription_info.get("endpoint"):
        print(f"[WebPush] No valid subscription endpoint — console fallback: {title}")
        return True

    try:
        from pywebpush import webpush, WebPushException, Vapid

        key_to_use = _vapid_instance
        if not key_to_use:
            key_to_use = Vapid.from_pem(VAPID_PRIVATE_KEY.encode('utf-8'))

        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=key_to_use,
            vapid_claims={"sub": VAPID_CLAIMS_SUB},
            headers={
                "TTL": "86400",
                "Urgency": "high"
            }
        )
        print(f"[WebPush Sent] ✅ High-Urgency Delivered: '{title}'")
        return True


    except Exception as e:
        err_str = str(e)
        print(f"[WebPush Error] ❌ Failed: {e}")
        # 410 Gone = subscription expired/unsubscribed — return signal to caller
        if '410' in err_str or 'unsubscribed or expired' in err_str:
            return None  # type: ignore[return-value]  # caller will delete from DB
        return False



def delete_push_subscription(patient_id: str):
    """Delete an expired/unsubscribed push subscription from DB and RAM."""
    patient_id_str = str(patient_id)
    _push_subscriptions.pop(patient_id_str, None)
    try:
        from db.postgres_client import SessionLocal
        from db.models import PushSubscription
        db = SessionLocal()
        db.query(PushSubscription).filter(
            PushSubscription.patient_id == patient_id_str
        ).delete()
        db.commit()
        db.close()
        print(f"[WebPush] 🗑️ Deleted stale subscription for patient {patient_id_str} — will re-register on next site visit.")
    except Exception as e:
        print(f"[WebPush DB Delete Error] {e}")


def notify_patient(patient_id: str, title: str, body: str, data: Optional[Dict] = None) -> bool:
    """High-level helper: look up subscription and send push to a patient."""
    patient_id_str = str(patient_id)
    subscription = get_push_subscription(patient_id_str)
    if not subscription:
        print(f"[WebPush] No subscription found for patient {patient_id_str} — console fallback.")
        print(f"[🔔 Console Notification] {title}: {body}")
        return True

    result = send_web_push_notification(subscription, title=title, body=body, data=data)

    # 410 Gone — subscription expired, auto-delete so it refreshes on next login
    if result is None:
        delete_push_subscription(patient_id_str)
        print(f"[🔔 Console Notification] {title}: {body}")
        return True

    return result
