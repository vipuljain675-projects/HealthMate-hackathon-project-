import os
from dotenv import load_dotenv
from sqlalchemy import text
from db.postgres_client import SessionLocal, init_db
from db.vector_client import chroma_client

load_dotenv()


def clear_all_data():
    print("[ResetDB] Connecting to live Supabase PostgreSQL to clear tables...")
    db = SessionLocal()
    try:
        # Truncate all tables using cascade
        db.execute(text("TRUNCATE TABLE appointments, reminders, labs, medications, visits, patients CASCADE;"))
        db.commit()
        print("[ResetDB] ✅ Live Supabase PostgreSQL database tables wiped clean!")
    except Exception as e:
        db.rollback()
        print(f"[ResetDB Warning] PostgreSQL truncate: {e}")
        # SQLite fallback if local
        try:
            for table in ["appointments", "reminders", "labs", "medications", "visits", "patients"]:
                db.execute(text(f"DELETE FROM {table};"))
            db.commit()
            print("[ResetDB] ✅ Tables cleared via DELETE.")
        except Exception as ex:
            print(f"[ResetDB Error] {ex}")
    finally:
        db.close()

    # Clear ChromaDB vector collection
    try:
        chroma_client.delete_collection("clinical_visit_notes")
        chroma_client.get_or_create_collection("clinical_visit_notes")
        print("[ResetDB] ✅ ChromaDB vector store cleared clean!")
    except Exception as e:
        print(f"[ResetDB Warning] ChromaDB clear: {e}")


if __name__ == "__main__":
    clear_all_data()
