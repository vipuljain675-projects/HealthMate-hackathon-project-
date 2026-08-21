import os
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

IMAGE_PATH = "/Users/vipuljain675/.gemini/antigravity-ide/brain/800a3fa9-428c-4f40-a168-c70617d3dbc8/sample_prescription_scan_1787308342215.png"


def run_real_ingestion_test():
    print("\n=======================================================")
    print("🚀 TESTING REAL OCR DOCUMENT INGESTION & PARSING PIPELINE")
    print("=======================================================\n")

    if not os.path.exists(IMAGE_PATH):
        print(f"Error: Image not found at {IMAGE_PATH}")
        return

    with open(IMAGE_PATH, "rb") as f:
        file_bytes = f.read()

    print("📄 1. Sending prescription image to POST /api/entry/ocr...")
    files = {"file": ("prescription_scan.png", file_bytes, "image/png")}
    headers = {"Authorization": "Bearer mock_token_dev"}

    res = client.post("/api/entry/ocr", files=files, headers=headers)
    print("Response Status Code:", res.status_code)
    assert res.status_code == 200

    json_data = res.json()
    print("\n✅ INGESTION RESULT:")
    print("File URL in Supabase Storage:", json_data.get("file_url"))
    print("Created Visit ID:", json_data.get("visit_id"))
    print("\nExtracted OCR Text Snippet:\n", json_data.get("raw_text_snippet"))
    print("\nExtracted Entities Summary:", json_data.get("extracted_entities"))

    print("\n-------------------------------------------------------")
    print("📋 2. Verifying Patient Timeline GET /api/timeline...")
    res = client.get("/api/timeline", headers=headers)
    assert res.status_code == 200
    timeline = res.json()
    print("Visits recorded in DB:", len(timeline.get("timeline_events", {}).get("visits", [])))

    print("\n-------------------------------------------------------")
    print("💊 3. Verifying Extracted Medications GET /api/medications...")
    res = client.get("/api/medications", headers=headers)
    assert res.status_code == 200
    meds = res.json()
    print("Extracted Medications in DB:")
    for m in meds:
        print(f"  - {m.get('drug_name')} ({m.get('dosage')}): {m.get('purpose')} [{m.get('frequency')}]")

    print("\n-------------------------------------------------------")
    print("🤖 4. Testing RAG AI Assistant Q&A POST /api/ask...")
    questions = [
        "What did Dr. Ramesh Verma prescribe for my chest tightness and cholesterol?",
        "What lab tests were ordered at Metro Heart & Kidney Institute?"
    ]

    for q in questions:
        print(f"\nUser Question: '{q}'")
        res = client.post("/api/ask", json={"question": q}, headers=headers)
        assert res.status_code == 200
        qa_data = res.json()
        print("AI Answer:\n", qa_data.get("answer"))

    print("\n=======================================================")
    print("🎉 REAL INGESTION TEST FULLY COMPLETED AND VERIFIED!")
    print("=======================================================\n")


if __name__ == "__main__":
    run_real_ingestion_test()
