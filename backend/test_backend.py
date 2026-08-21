import os
import json
from fastapi.testclient import TestClient
from main import app
from seed_db import seed_database

client = TestClient(app)


def test_full_backend_flow():
    print("\n--- 1. Seeding Database ---")
    seed_database()

    print("\n--- 2. Testing Health Endpoint GET / ---")
    res = client.get("/")
    assert res.status_code == 200
    print("Health check response:", res.json())

    print("\n--- 3. Testing Patient Profile GET /api/me ---")
    res = client.get("/api/me")
    assert res.status_code == 200
    print("Patient profile:", res.json())

    print("\n--- 4. Testing Timeline GET /api/timeline ---")
    res = client.get("/api/timeline")
    assert res.status_code == 200
    data = res.json()
    print("Timeline summary snippet:", data.get("summary")[:150])
    print("Visits count:", len(data.get("timeline_events", {}).get("visits", [])))

    print("\n--- 5. Testing Medications GET /api/medications ---")
    res = client.get("/api/medications")
    assert res.status_code == 200
    print("Medications list:", res.json())

    print("\n--- 6. Testing Manual Entry POST /api/entry/manual ---")
    new_entry = {
        "date": "2025-08-20",
        "hospital": "Fortis Healthcare",
        "doctor_name": "Dr. Rajesh Sharma",
        "reason": "Routine Checkup",
        "diagnosis": "Normal",
        "notes": "Patient feeling healthy. Vitals normal.",
        "medications": [
            {
                "drug_name": "Vitamin D3",
                "dosage": "60K IU",
                "frequency": "once weekly",
                "purpose": "Bone health",
                "status": "active"
            }
        ],
        "labs": [
            {
                "test_name": "Vitamin D",
                "value": "28 ng/mL",
                "flag": "low"
            }
        ]
    }
    res = client.post("/api/entry/manual", json=new_entry)
    assert res.status_code == 200
    print("Manual entry response:", res.json())

    print("\n--- 7. Testing Reminders GET & POST ---")
    res = client.post("/api/reminders", json={
        "medicine_name": "Vitamin D3",
        "dosage": "60K IU",
        "time_of_day": "09:00",
        "frequency": "weekly"
    })
    assert res.status_code == 200
    res = client.get("/api/reminders")
    assert res.status_code == 200
    print("Reminders list:", res.json())

    print("\n--- 8. Testing Appointments GET & POST ---")
    res = client.post("/api/appointments", json={
        "doctor_name": "Dr. Rajesh Sharma",
        "hospital": "Fortis Healthcare",
        "appointment_date": "2025-10-15",
        "appointment_time": "11:00",
        "reason": "Vitamin D follow up"
    })
    assert res.status_code == 200
    res = client.get("/api/appointments")
    assert res.status_code == 200
    print("Appointments list:", res.json())

    print("\n--- 9. Testing Hybrid RAG Q&A POST /api/ask ---")
    res = client.post("/api/ask", json={
        "question": "What medications am I taking for my blood pressure?"
    })
    assert res.status_code == 200
    qa_res = res.json()
    print("Question:", qa_res.get("question"))
    print("AI Answer:\n", qa_res.get("answer"))

    print("\n✅ ALL BACKEND API ENDPOINTS TESTED AND WORKING PERFECTLY!")


if __name__ == "__main__":
    test_full_backend_flow()
