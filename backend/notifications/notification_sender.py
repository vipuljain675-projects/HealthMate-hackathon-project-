import os
import json
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_CLAIMS_SUB = os.getenv("VAPID_CLAIMS_SUB", "mailto:admin@example.com")


def send_web_push_notification(
    subscription_info: Dict[str, Any],
    title: str,
    body: str,
    icon: str = "/icon.png",
    data: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Sends a Web Push notification to a target user browser subscription.
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

    try:
        from pywebpush import webpush, WebPushException

        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_CLAIMS_SUB}
        )
        print(f"[WebPush Sent] Successfully delivered notification: '{title}'")
        return True

    except Exception as e:
        print(f"[WebPush Error] Failed to deliver push notification: {e}")
        return False
