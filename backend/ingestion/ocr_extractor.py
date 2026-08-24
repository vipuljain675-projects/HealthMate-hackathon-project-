import os
import re
import time
import base64
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
# Vision models to try in order of preference
GROQ_VISION_MODELS = [
    "qwen/qwen3.6-27b",
    "meta-llama/llama-4-scout-17b-16e-instruct",
]


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


def get_groq_api_key() -> str:
    return (os.getenv("GROQ_API_KEY") or "").strip()

def extract_text_from_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
    api_key = get_groq_api_key()
    if not api_key:
        print("[OCR] GROQ_API_KEY not set. Using local pytesseract OCR.")
        return extract_text_local(image_bytes, mime_type)

    try:
        from groq import Groq
        client = Groq(api_key=api_key)


        base64_image = base64.b64encode(image_bytes).decode("utf-8")
        image_url = f"data:{mime_type};base64,{base64_image}"

        prompt = (
            "You are an expert medical OCR assistant. Extract ALL text from this medical document image.\n"
            "IMPORTANT RULES:\n"
            "- Extract EVERY piece of text visible in the document — headers, patient info, dates, doctor names, lab names.\n"
            "- For PRESCRIPTIONS: Extract all drug names, dosages, frequencies, duration, and doctor instructions.\n"
            "- For LAB REPORTS: Extract EVERY test name, result value, unit, reference range, and interpretation/flag.\n"
            "  Example: 'TOTAL CHOLESTEROL: 215 mg/dL (Desirable: <200) — ELEVATED'\n"
            "- For DISCHARGE SUMMARIES: Extract diagnosis, procedures, medications on discharge, follow-up instructions.\n"
            "- Include the hospital/lab name, doctor name, patient name, date, and any ID numbers.\n"
            "- Return ONLY the extracted raw text. No commentary, no formatting suggestions."
        )

        # Try each vision model with retry
        for model in GROQ_VISION_MODELS:
            for attempt in range(2):  # 2 attempts per model
                try:
                    response = client.chat.completions.create(
                        model=model,
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
                        max_tokens=2500,
                    )

                    extracted_text = response.choices[0].message.content or ""
                    cleaned = clean_ocr_text(extracted_text)

                    if cleaned and len(cleaned) > 20:
                        print(f"[OCR] Successfully extracted {len(cleaned)} chars using {model}")
                        return cleaned

                except Exception as e:
                    err_str = str(e).lower()
                    print(f"[OCR] {model} attempt {attempt+1} error: {str(e)[:120]}")

                    # If rate limited, wait before retry
                    if "rate" in err_str or "429" in err_str or "limit" in err_str:
                        wait_time = 2 * (attempt + 1)
                        print(f"[OCR] Rate limited. Waiting {wait_time}s before retry...")
                        time.sleep(wait_time)
                    else:
                        break  # Non-rate-limit error, try next model

        print("[OCR] All Groq Vision models failed. Falling back to pytesseract...")

    except Exception as e:
        print(f"[OCR] Groq client initialization error: {str(e)[:120]}")

    # Final fallback: pytesseract — ALWAYS return whatever it captures
    local_text = extract_text_local(image_bytes, mime_type)
    if local_text and len(local_text.strip()) > 10:
        print(f"[OCR] Pytesseract captured {len(local_text)} chars as fallback")
        return local_text

    # Absolute last resort — still return something useful, not a garbage placeholder
    return "Medical document scan uploaded. OCR extraction was unable to read text from this image. Please verify the image quality."
