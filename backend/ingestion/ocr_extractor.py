import os
import base64
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_VISION_MODEL = os.getenv("GROQ_VISION_MODEL", "llama-3.2-90b-vision-preview")


def extract_text_from_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
    """
    Performs OCR extraction on an image/PDF document scan using Groq Vision API.
    """
    if not GROQ_API_KEY:
        print("[OCR] GROQ_API_KEY not set. Using mock OCR text extraction.")
        return """
        PATIENT VISIT SUMMARY
        Date: 2025-06-15
        Hospital: City Care Clinic
        Doctor: Dr. Anjali Sharma
        Reason for Visit: Routine hypertension follow-up & mild headache
        Diagnosis: Essential Hypertension, controlled
        
        Prescribed Medications:
        - Amlodipine 5mg, once daily, for blood pressure control
        - Metformin 500mg, twice daily, for blood sugar management
        
        Lab Results:
        - HbA1c: 6.2% (normal)
        - Serum Creatinine: 0.9 mg/dL (normal)
        
        Doctor Notes: Patient complains of occasional afternoon headaches. Advised 30 minutes daily walking, low-sodium diet. Next follow up appointment scheduled in 3 months.
        """

    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)

        base64_image = base64.b64encode(image_bytes).decode("utf-8")
        image_url = f"data:{mime_type};base64,{base64_image}"

        prompt = (
            "You are an expert medical OCR assistant. Extract ALL text, medical details, "
            "prescriptions, doctor notes, lab results, date, hospital, and doctor names from this document image. "
            "Return clean, complete raw text preserves all clinical values and details."
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
        return extracted_text.strip()

    except Exception as e:
        print(f"[OCR] Groq Vision error: {e}")
        return f"[OCR Fallback Extraction] Error processing image: {str(e)}"
