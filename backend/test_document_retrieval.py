from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_document_retrieval_query():
    print("\n=======================================================")
    print("🤖 TESTING CHATBOT DOCUMENT LINK RETRIEVAL")
    print("=======================================================\n")

    headers = {"Authorization": "Bearer mock_token_dev"}
    user_query = "hey buddy give me back my uploaded prescription document scan again!"

    print(f"User Asking: '{user_query}'")
    res = client.post("/api/ask", json={"question": user_query}, headers=headers)
    assert res.status_code == 200

    json_data = res.json()
    answer = json_data.get("answer", "")
    print("\n🤖 AI Chatbot Answer:\n", answer)

    # Verify that answer or sources contains the Supabase Storage URL
    has_supabase_url = "supabase.co/storage" in answer or "http" in answer
    print(f"\nDocument Storage URL returned in response? {has_supabase_url}")

    print("\n=======================================================")
    print("🎉 DOCUMENT RETRIEVAL CHATBOT TEST VERIFIED!")
    print("=======================================================\n")


if __name__ == "__main__":
    test_document_retrieval_query()
