import os
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.background import BackgroundScheduler

from db.postgres_client import init_db
from api.routes import router as api_router
from notifications.reminder_scheduler import check_due_medicine_reminders
from notifications.appointment_scheduler import check_upcoming_appointments

scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic: init DB tables & start background notification schedulers
    print("[Main] Bootstrapping Personal Health App Backend...")
    init_db()
    print("[Main] Database tables initialized successfully.")

    # Configure background jobs
    scheduler.add_job(check_due_medicine_reminders, "interval", minutes=1, id="medicine_reminder_job")
    scheduler.add_job(check_upcoming_appointments, "interval", hours=1, id="appointment_reminder_job")
    scheduler.start()
    print("[Main] Background notification schedulers started.")

    yield

    # Shutdown logic
    print("[Main] Shutting down background schedulers...")
    scheduler.shutdown()


app = FastAPI(
    title="Personal Health App API",
    description="Multimodal Clinical Ingestion, Hybrid SQL/Vector RAG, and Proactive Health Notifications",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend (local dev & production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local scans directory if created
scans_dir = "./data/scans"
os.makedirs(scans_dir, exist_ok=True)
app.mount("/scans", StaticFiles(directory=scans_dir), name="scans")

# Include API Router
app.include_router(api_router)


@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "service": "Personal Health App Backend API",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
