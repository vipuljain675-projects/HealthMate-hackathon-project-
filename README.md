# HealthVault — AI Personal Health OS 🏥

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js%2014-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-FF6F00?style=for-the-badge&logo=datadog&logoColor=white)](https://www.trychroma.com/)
[![Twilio](https://img.shields.io/badge/Twilio-F22F46?style=for-the-badge&logo=twilio&logoColor=white)](https://www.twilio.com/)
[![Groq](https://img.shields.io/badge/Groq-F05032?style=for-the-badge&logo=git&logoColor=white)](https://groq.com/)

**HealthVault** is a state-of-the-art, installable **AI-powered Personal Health Operating System**. It aggregates unstructured medical records (handwritten prescriptions, clinical lab notes, diagnostic scans), processes them through a multi-model cognitive vision pipeline, and converts them into structured relational and vector databases (SQL + ChromaDB). 

The platform features a **Hybrid RAG Q&A Assistant** (SQL Relational Facts + Vector Semantic Embeddings) and a **24/7 Cloud Background Scheduler** that delivers proactive **Twilio WhatsApp Notifications** for medicine schedules and doctor consultations directly to the patient's mobile phone—even when the website is completely closed.

---

## 📑 Table of Contents
1. [🏗️ System Architecture & Data Flow](#️-system-architecture--data-flow)
2. [📂 Detailed Directory & Module Map](#-detailed-directory--module-map)
3. [🧠 Hybrid RAG (Retrieval-Augmented Generation)](#-hybrid-rag-retrieval-augmented-generation)
4. [👁️ Vision & Cognitive Ingestion Pipeline](#️-vision--cognitive-ingestion-pipeline)
5. [📱 Twilio WhatsApp Notification Architecture](#-twilio-whatsapp-notification-architecture)
6. [⏰ Timezone-Aware Background Cron Schedulers](#-timezone-aware-background-cron-schedulers)
7. [💻 Full Technical Code Walkthrough](#-full-technical-code-walkthrough)
8. [📐 Key Architectural Decisions](#-key-architectural-decisions)
9. [🛠️ Local Setup & Environment Setup](#️-local-setup--environment-setup)
10. [☁️ Production Deployment (Render + Vercel + Supabase)](#️-production-deployment-render--vercel--supabase)

---

## 🏗️ System Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Client [Frontend - Next.js 14 App Router]
        UI[React Tailwind UI] <--> HeaderModal[Profile Modal - Phone Sync]
        UI <--> RemindersPage[Reminders Dashboard]
    end

    subgraph API [Backend - FastAPI Service]
        Routes[api/routes.py]
        Auth[auth/verify_supabase_token.py]
        Main[main.py]
        APScheduler[APScheduler 24/7 Background Cron]
    end

    subgraph Cognitive [Cognitive Vision Ingestion Pipeline]
        OCR[ocr_extractor.py: Qwen-27B Vision LLM]
        Struct[entity_structurer.py: GPT-120B Structural Parser]
    end

    subgraph Storage [Hybrid Storage Engine]
        Postgres[(Supabase PostgreSQL Database)]
        Chroma[(ChromaDB Vector Store)]
    end

    subgraph Retrieval [Hybrid RAG Retrieval Engine]
        SQLRet[structured_retriever.py]
        VecRet[semantic_retriever.py]
        Augment[prompt_builder.py]
    end

    subgraph Gen [Generation & Dispatch Engines]
        QA[qa_generator.py: GPT-120B]
        TwilioDispatcher[notification_sender.py: Twilio WhatsApp SDK]
        RemSched[reminder_scheduler.py: Timezone-Aware IST Cron]
        ApptSched[appointment_scheduler.py: IST Date Matcher]
    end

    %% Ingestion Flow
    UI -->|1. Upload Medical Scan| Routes
    Routes --> OCR -->|Raw Text| Struct
    Struct -->|JSON Patient, Visit, Meds, Labs| Postgres
    Struct -->|Clinical Notes Embeddings| Chroma
    
    %% Clinical NLP Alarm Auto-Sync
    Postgres -->|Infer Dosage/Frequencies| AutoSync[auto_sync_reminders_from_medications]
    AutoSync -->|Populates Alarms| Postgres

    %% Proactive Background Scheduler & WhatsApp Flow
    APScheduler -->|Every 60s Tick| RemSched & ApptSched
    RemSched & ApptSched -->|Query Active Alarms due at IST HH:MM| Postgres
    RemSched & ApptSched -->|Dispatch Alert| TwilioDispatcher
    TwilioDispatcher -->|REST API POST| TwilioCloud[Twilio WhatsApp Cloud API]
    TwilioCloud -->|WhatsApp Notification| Phone[Patient Mobile Device 📱]

    %% Q&A Hybrid RAG Flow
    UI -->|2. Ask Health Question| Routes
    Routes --> QA
    QA --> SQLRet & VecRet
    SQLRet -->|Exact Dosage & Lab Flag Facts| Postgres
    VecRet -->|Contextual Doctor Excerpts| Chroma
    SQLRet & VecRet --> Augment -->|Context Augmented Prompt| QA
    QA -->|Grounded Clinical Answer| UI
```

---

## 📂 Detailed Directory & Module Map

```text
HealthMate-hackathon-project-/
├── backend/
│   ├── api/
│   │   └── routes.py                 # REST Endpoints: OCR Ingestion, CRUD Operations, Q&A, Patient Profiles
│   ├── augmentation/
│   │   └── prompt_builder.py         # Merges SQL exact facts + Vector similarity chunks into LLM prompt
│   ├── auth/
│   │   └── verify_supabase_token.py    # JWT Verification Middleware enforcing Supabase Auth security
│   ├── db/
│   │   ├── models.py                 # SQLAlchemy ORM Data Models (Patient, Visit, Medication, Lab, Reminder)
│   │   ├── postgres_client.py        # Database connection pooler & CRUD operations + NLP Alarm Auto-Sync
│   │   └── vector_client.py          # ChromaDB client wrapper for sentence embeddings indexing & search
│   ├── generation/
│   │   ├── qa_generator.py           # Hybrid RAG Orchestrator (Groq GPT-120B HTTP Client)
│   │   └── timeline_summarizer.py    # Clinical Timeline summarization engine using LLMs
│   ├── ingestion/
│   │   ├── entity_structurer.py      # Transforms raw OCR text into structured JSON schemas via GPT-120B
│   │   ├── file_storage.py           # In-memory and local disk file handling for medical scan uploads
│   │   └── ocr_extractor.py          # Vision LLM (qwen/qwen3.6-27b) OCR processor for document scans
│   ├── notifications/
│   │   ├── appointment_scheduler.py  # Background cron worker checking upcoming doctor appointments (IST date)
│   │   ├── notification_sender.py    # High-level Twilio WhatsApp SDK wrapper & fallback logger
│   │   └── reminder_scheduler.py     # Background cron worker checking due medicine alarms (IST HH:MM)
│   ├── main.py                       # FastAPI application entrypoint, CORS configuration, APScheduler lifecycle
│   ├── Procfile                      # Render PaaS production deployment configuration
│   └── requirements.txt              # Backend Python package dependencies
│
├── frontend/
│   ├── app/                          # Next.js 14 App Router layout & application pages
│   │   ├── ask/                      # AI Assistant Chat Interface with Markdown & LaTeX support
│   │   ├── appointments/             # Doctor Consultations & Schedule Tracker
│   │   ├── medications/              # Active & Historical Extracted Prescriptions Dashboard
│   │   ├── reminders/                # Medicine Alarms Manager with WhatsApp Status Indicators
│   │   ├── timeline/                 # Visual Patient Health Timeline & OCR Document Uploader
│   │   ├── layout.tsx                # Main App Frame, Sidebar Navigation, & Header Bar Wrapper
│   │   └── page.tsx                  # Patient Overview Dashboard & Summary Analytics
│   ├── components/                   # Reusable UI Components (HeaderBar, Sidebar, Modals, Cards)
│   ├── lib/
│   │   └── config.ts                 # API Endpoint Router (Production Render URL vs Localhost)
│   ├── public/                       # Static Assets & PWA Configs
│   └── package.json                  # Next.js 14 Frontend dependencies & script commands
```

---

## 🧠 Hybrid RAG (Retrieval-Augmented Generation)

HealthVault implements a **Hybrid RAG** architecture combining relational PostgreSQL queries with vector similarity search in ChromaDB.

```
                    ┌───────────────────────────┐
                    │       Patient Query       │
                    └─────────────┬─────────────┘
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
      ┌───────────────────────┐       ┌───────────────────────┐
      │  Relational Database  │       │    Vector Database    │
      │     (PostgreSQL)      │       │      (ChromaDB)       │
      ├───────────────────────┤       ├───────────────────────┤
      │ Exact facts (dosage,  │       │ Free-text clinical    │
      │ appointment dates,    │       │ notes & doctor        │
      │ lab reference flags)  │       │ observations          │
      └───────────┬───────────┘       └───────────┬───────────┘
                  │                               │
                  └───────────────┬───────────────┘
                                  ▼
                    ┌───────────────────────────┐
                    │   Augmentation Engine     │
                    │    (prompt_builder.py)    │
                    └─────────────┬─────────────┘
                                  ▼
                    ┌───────────────────────────┐
                    │    Generation Engine      │
                    │   (openai/gpt-oss-120b)   │
                    └───────────────────────────┘
```

### 1. Structured SQL Retrieval (`structured_retriever.py`)
Queries **PostgreSQL** directly. Standard vector search often fails on precise clinical queries such as *"What is my Paracetamol dosage?"* or *"What was my Fasting Glucose reading on August 15?"*. Structured retrieval executes filtered SQL queries:
* **Medication Records:** Fetches exact drug name, dosage, frequency, and status.
* **Lab Results:** Fetches exact numeric values, unit strings, and flag tags (e.g. `high`, `borderline`).
* **Appointments:** Fetches doctor names, hospital addresses, and time slots.

### 2. Semantic Vector Retrieval (`semantic_retriever.py`)
Queries **ChromaDB** vector store using semantic similarity search. When a patient asks contextual questions like *"Why did Dr. Gupta switch my prescription last month?"*, the system embeds the query using sentence transformers and retrieves top-matching unstructured clinical notes and diagnostic impressions.

---

## 👁️ Vision & Cognitive Ingestion Pipeline

Medical document processing in HealthVault operates via a **3-Stage Cognitive Pipeline**:

1. **Vision OCR Ingestion (`ocr_extractor.py`)**: 
   Scans uploaded prescription images and clinical PDFs using Groq's high-resolution vision LLM `qwen/qwen3.6-27b`, extracting raw handwritten or printed medical text.
2. **Structural Entity Parsing (`entity_structurer.py`)**:
   Sends the raw text to `openai/gpt-oss-120b` with JSON schema enforcement to produce clean structured JSON entities:
   - Patient Metadata (Name, DOB, Gender, Allergies)
   - Clinical Visit Records (Doctor Name, Hospital, Visit Date, Diagnosis)
   - Medications (Name, Dosage, Frequency, Duration)
   - Lab Results (Test Name, Result Value, Unit, Reference Range, Flag)
3. **Automated Clinical NLP Alarm Sync (`postgres_client.py`)**:
   An NLP parser inspects unstructured dosage directions and automatically synthesizes active notification alarms:
   - `"twice daily after food"` ➔ Generates **09:00 AM** and **09:00 PM** alarms.
   - `"once daily at bedtime"` ➔ Generates **10:00 PM** alarm.

---

## 📱 Twilio WhatsApp Notification Architecture

To overcome browser limitations (such as browser tabs being closed or push subscriptions expiring), HealthVault leverages **Twilio's Programmable Messaging WhatsApp API**.

```
+-------------------+      1. Check Due Alarms (IST)     +--------------------+
|  FastAPI Backend  | ---------------------------------> | Supabase Postgres  |
|  (APScheduler)    | <--------------------------------- | (Reminders Table)  |
+---------+---------+      2. Returns Active Alarms      +--------------------+
          |
          | 3. Dispatch Notification via Twilio Python SDK
          v
+-------------------+      4. HTTP POST Payload          +--------------------+
| notification_     | ---------------------------------> | Twilio WhatsApp    |
| sender.py         |                                    | Cloud API          |
+-------------------+                                    +---------+----------+
                                                                   |
                                                                   | 5. Instant WhatsApp Push
                                                                   v
                                                         +--------------------+
                                                         | Patient WhatsApp   |
                                                         | Mobile App 📱      |
                                                         +--------------------+
```

### Core Twilio Configuration
- **API Protocol:** REST HTTP API using `twilio.rest.Client`.
- **Authentication:** `TWILIO_ACCOUNT_SID` & `TWILIO_AUTH_TOKEN`.
- **Sandbox Sender Number:** `whatsapp:+17372508034`.
- **Delivery Guarantees:** Multi-country delivery fallback with cryptographic request signing.

---

## ⏰ Timezone-Aware Background Cron Schedulers

A critical engineering challenge in cloud platforms (like Render or AWS) is that servers run in **UTC Timezone** by default. When a patient in India sets a medicine reminder for **1:15 PM IST (13:15)**, the UTC server clock reads **07:45 AM (07:45)**.

HealthVault resolves this by embedding **Explicit IST Timezone Alignment** in its background schedulers:

```python
# Convert cloud server UTC time to Indian Standard Time (IST = UTC + 5:30)
ist_now = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
now_time_str = ist_now.strftime("%H:%M")

# Query database for matching alarms due at current IST minute
reminders = db.query(Reminder).filter(
    Reminder.active == True,
    Reminder.time_of_day == now_time_str
).all()
```

---

## 💻 Full Technical Code Walkthrough

### 1. `ocr_extractor.py` — Vision OCR Ingestion
```python
def extract_text_from_image(image_bytes: bytes) -> str:
    """Invokes Groq's qwen3.6-27b vision model to convert medical scans into clinical text."""
    base64_image = base64.b64encode(image_bytes).decode("utf-8")
    payload = {
        "model": "qwen/qwen3.6-27b",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Extract all clinical text, prescriptions, doctor notes, and lab values accurately."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                ]
            }
        ],
        "temperature": 0.1
    }
    # Executes HTTP request to Groq API and returns raw text
```

### 2. `notification_sender.py` — WhatsApp Message Dispatcher
```python
def send_whatsapp_notification(to_phone: str, body: str, content_sid: Optional[str] = None, content_variables: Optional[dict] = None) -> bool:
    """Sends a WhatsApp message via Twilio SDK using Sandbox Content SIDs or freeform text."""
    client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    phone = f"whatsapp:{to_phone}" if not to_phone.startswith("whatsapp:") else to_phone
    
    if content_sid:
        message = client.messages.create(
            from_=TWILIO_WHATSAPP_NUMBER,
            content_sid=content_sid,
            content_variables=json.dumps(content_variables or {}),
            to=phone
        )
    else:
        message = client.messages.create(
            from_=TWILIO_WHATSAPP_NUMBER,
            body=body,
            to=phone
        )
    return True
```

### 3. `reminder_scheduler.py` — Timezone-Aware Background Worker
```python
def check_due_medicine_reminders():
    """APScheduler job running every minute to trigger WhatsApp alerts for due medicine alarms."""
    ist_now = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
    now_time_str = ist_now.strftime("%H:%M")
    
    db = SessionLocal()
    reminders = db.query(Reminder).filter(
        Reminder.active == True,
        Reminder.time_of_day == now_time_str
    ).all()
    
    for r in reminders:
        title = f"💊 Medicine Reminder: {r.medicine_name}"
        body = f"Time to take your {r.dosage or ''} dose of {r.medicine_name}."
        notify_patient(patient_id=str(r.patient_id), title=title, body=body)
```

---

## 📐 Key Architectural Decisions

### Why Hybrid RAG Instead of Fine-Tuning LLMs?

| Vector / Model Metric | Fine-Tuned Model | Hybrid RAG (HealthVault) |
|---|---|---|
| **Clinical Hallucinations** | **High risk.** Fine-tuned LLMs fabricate dosage numbers. | **Zero.** Answers strictly reference SQL database facts. |
| **Real-time Data Update** | **Requires Retraining.** Expensive GPU cycles needed per upload. | **Instant (`<100ms`).** Inserted directly into PostgreSQL & Chroma. |
| **Data Privacy & Isolation** | **Leak Risk.** Patient A data can bleed into Patient B output. | **100% Isolated.** Secured via SQL `WHERE patient_id = UUID`. |
| **Infrastructure Cost** | **High.** Requires dedicated A100/H100 GPU clusters. | **Minimal.** Runs on lightweight serverless APIs & CPU databases. |

---

## 🛠️ Local Setup & Environment Setup

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **Supabase Account** (or local PostgreSQL)
- **Twilio Account** (WhatsApp Sandbox enabled)

### 2. Environment Variables Configuration

Create `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:your_db_password@db.your_supabase_ref.supabase.co:6543/postgres?sslmode=require"
GROQ_API_KEY="your_groq_api_key"
TWILIO_ACCOUNT_SID="your_twilio_account_sid"
TWILIO_AUTH_TOKEN="your_twilio_auth_token"
TWILIO_WHATSAPP_NUMBER="whatsapp:+17372508034"
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL="http://localhost:8000"
```

### 3. Running Backend (FastAPI)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

### 4. Running Frontend (Next.js 14)
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to access the application dashboard.

---

## ☁️ Production Deployment (Render + Vercel + Supabase)

- **Frontend:** Deployed on **Vercel** (Next.js 14 App Router).
- **Backend API & Cron:** Deployed on **Render PaaS** (Python 3.11 environment with background worker support).
- **Database:** Hosted on **Supabase** (Managed PostgreSQL Relational Store).
- **Messaging Service:** Powered by **Twilio Programmable Messaging Cloud**.

---

<p align="center">
Built with ❤️ for Health Tech Innovation.
</p>
