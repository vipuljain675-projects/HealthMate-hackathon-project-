import os
import uuid
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
LOCAL_SCANS_DIR = "./data/scans"

os.makedirs(LOCAL_SCANS_DIR, exist_ok=True)


def upload_scan_file(file_bytes: bytes, filename: str, content_type: str = "image/jpeg") -> str:
    """
    Uploads document scan to Supabase Storage bucket 'medical-scans' and returns public URL.
    """
    file_ext = os.path.splitext(filename)[1] or ".jpg"
    unique_filename = f"scan_{uuid.uuid4()}{file_ext}"

    # Prefer secret key for storage uploads, fallback to public key
    storage_key = SUPABASE_JWT_SECRET or SUPABASE_KEY

    if SUPABASE_URL and storage_key and "your-supabase" not in SUPABASE_URL:
        try:
            from supabase import create_client
            supabase = create_client(SUPABASE_URL, storage_key)
            bucket_name = "medical-scans"

            # Upload to Supabase Storage
            supabase.storage.from_(bucket_name).upload(
                path=unique_filename,
                file=file_bytes,
                file_options={"content-type": content_type}
            )

            public_url = supabase.storage.from_(bucket_name).get_public_url(unique_filename)
            print(f"[FileStorage] Uploaded document scan to Supabase Storage: {public_url}")
            return public_url

        except Exception as e:
            print(f"[FileStorage Warning] Supabase Storage upload error, falling back to local: {e}")

    # Local filesystem fallback
    local_path = os.path.join(LOCAL_SCANS_DIR, unique_filename)
    with open(local_path, "wb") as f:
        f.write(file_bytes)

    backend_domain = os.getenv("RENDER_EXTERNAL_URL") or os.getenv("BACKEND_URL") or "https://healthmate-hackathon-project.onrender.com"
    return f"{backend_domain.rstrip('/')}/scans/{unique_filename}"
