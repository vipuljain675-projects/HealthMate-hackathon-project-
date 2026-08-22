import os
import re
import base64
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
# qwen/qwen3.6-27b is the only vision model on Groq — used only when available
GROQ_VISION_MODEL = "qwen/qwen3.6-27b"


def clean_ocr_text(text: str) -> str:
    """Strips <think>...</think> reasoning blocks from LLM Vision response."""
    if not text:
        return ""
    cleaned = re.sub(r'<think>[\s\S]*?</think>', '', text, flags=re.IGNORECASE)
    cleaned = re.sub(r'<think>[\s\S]*', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'</?think>', '', cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


def extract_text_local(image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
    """Fallback: Uses local pytesseract OCR — free, unlimited, no API quota needed."""
    try:
        from PIL import Image
        import pytesseract
        import io

        img = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(img, lang='eng')
        return text.strip()
    except ImportError:
        return ""
    except Exception as e:
        print(f"[OCR-Local] pytesseract error: {e}")
        return ""


def extract_text_from_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
    """
    Performs OCR extraction on an image document scan.
    Tries Groq Vision API first, falls back to local pytesseract if rate-limited.
    """
    if not GROQ_API_KEY:
        print("[OCR] GROQ_API_KEY not set. Using local pytesseract OCR.")
        return extract_text_local(image_bytes, mime_type)

    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)

        base64_image = base64.b64encode(image_bytes).decode("utf-8")
        image_url = f"data:{mime_type};base64,{base64_image}"

        prompt = (
            "You are an expert medical OCR assistant. Extract ALL text, medical details, "
            "prescriptions, doctor notes, lab results, date, hospital, and doctor names from this document image. "
            "Return ONLY the extracted raw clinical text."
        )

        response = client.chat.completions.create(
            model=GROQ_VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": image_url}},
                    ],
                }
            ],
            temperature=0.1,
            max_tokens=1500,
        )

        extracted_text = response.choices[0].message.content or ""
        return clean_ocr_text(extracted_text)

    except Exception as e:
        err_str = str(e)
        print(f"[OCR] Groq Vision exception: {err_str[:120]}")
        print("[OCR] Falling back to local pytesseract OCR engine...")
        local_text = extract_text_local(image_bytes, mime_type)
        if local_text and len(local_text.strip()) > 10:
            return local_text
        return f"OCR extraction attempted for scan image. Document uploaded successfully."
