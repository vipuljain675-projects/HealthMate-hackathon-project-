# HealthVault — AI Personal Health OS 🏥

HealthVault is an installable, AI-powered Personal Health Operating System. It aggregates unstructured medical records (prescriptions, clinical notes, lab reports), processes them through a multi-model cognitive pipeline, and converts them into structured databases (SQL + Vector). The system then provides a hybrid RAG Q&A assistant and triggers automated OS-level VAPID push notifications for medicine schedules and doctor appointments, even when the website is completely closed.

---

## 🏗️ System Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Client [Frontend - Next.js PWA]
        UI[React UI] <--> usePush[usePushNotifications.ts]
        SW[sw.js Service Worker] <--> PushServer[Apple/Google Push Servers]
    end

    subgraph API [Backend - FastAPI]
        Routes[api/routes.py]
        Main[main.py]
        Scheduler[APScheduler Schedulers]
    end

    subgraph Cognitive [Cognitive Ingestion Pipeline]
        OCR[ocr_extractor.py: Qwen-27B Vision]
        Struct[entity_structurer.py: GPT-120B]
    end

    subgraph Storage [Hybrid Databases]
        Postgres[(Supabase PostgreSQL)]
        Chroma[(ChromaDB Vector Store)]
    end

    subgraph Retrieval [Hybrid RAG Retrieval]
        SQLRet[structured_retriever.py]
        VecRet[semantic_retriever.py]
    end

    subgraph Gen [Generation Layer]
        QA[qa_generator.py: GPT-120B]
    end

    %% Ingestion Flow
    UI -->|Upload Document Scan| Routes
    Routes --> OCR -->|Plain clinical text| Struct
    Struct -->|Visits, Labs, Meds JSON| Postgres
    Struct -->|Embeddings| Chroma
    
    %% NLP Alarms Auto-Sync Flow
    Postgres -->|Infers meal/time directives| AutoSync[auto_sync_reminders_from_medications]
    AutoSync -->|Populates| Postgres

    %% Proactive Scheduler Flow
    Scheduler -->|Cron tick| RemSched[reminder_scheduler.py]
    RemSched -->|VAPID high-urgency push| PushServer
    PushServer -->|OS Alert Banner| SW

    %% Q&A RAG Flow
    UI -->|Ask Question| Routes
    Routes --> QA
    QA --> SQLRet & VecRet
    SQLRet --> Postgres
    VecRet --> Chroma
    QA -->|Grounded Answer| UI
```

---

## 📂 Project Directory Structure

```text
├── backend/
│   ├── api/
│   │   └── routes.py              # REST API endpoints (OCR processing, CRUD operations, Q&A, Web Push)
│   ├── augmentation/
│   │   └── prompt_builder.py      # Combines SQL records + Vector search excerpts into rich LLM prompts
│   ├── auth/
│   │   └── verify_supabase_token.py # JWT Token validation middleware for Supabase Auth
│   ├── db/
│   │   ├── models.py              # SQLAlchemy database tables (Patient, Visit, Medication, Lab, Reminder, etc.)
│   │   ├── postgres_client.py     # Database connection pooler and CRUD queries
│   │   └── vector_client.py       # ChromaDB vector store wrapper for clinical note embeddings
│   ├── generation/
│   │   ├── qa_generator.py        # RAG orchestrator + REST HTTPX connection to Groq (openai/gpt-oss-120b)
│   │   └── timeline_summarizer.py # Summarizes clinical visit timeline records using LLMs
│   ├── ingestion/
│   │   ├── entity_structurer.py   # Extracts clinical JSON entities from OCR output using GPT models
│   │   ├── file_storage.py        # Handles medical record file uploads to storage
│   │   └── ocr_extractor.py       # Vision LLM (qwen/qwen3.6-27b) OCR processor for document scans
│   ├── notifications/
│   │   ├── appointment_scheduler.py # Background cron checker for upcoming doctor appointments
│   │   ├── notification_sender.py # Handles VAPID Web Push formatting and pywebpush dispatch
│   │   └── reminder_scheduler.py  # Background cron checker for medicine reminders
│   ├── main.py                    # App bootstrap, CORS configurations, background job schedulers
│   ├── Procfile                   # Deployment config for Render PaaS
│   └── requirements.txt           # Python application dependencies
│
├── frontend/
│   ├── app/                       # Next.js 14 App Router layout and pages
│   │   ├── ask/                   # AI Assistant chat page
│   │   ├── appointments/          # Consultation scheduler page
│   │   ├── medications/           # Extracted prescriptions tracker
│   │   ├── reminders/             # Medicine alarms scheduler page
│   │   ├── timeline/              # Patient health timeline visualizer
│   │   ├── layout.tsx             # Global sidebar, header wrapper, and PWA manifest links
│   │   └── page.tsx               # Overview dashboard
│   ├── components/                # Reusable UI component cards and layouts
│   ├── hooks/
│   │   └── usePushNotifications.ts # Registers browser Service Worker and manages VAPID keys
│   ├── lib/
│   │   └── config.ts              # API URL endpoint routing config
│   ├── public/
│   │   ├── manifest.json          # PWA config enabling installation on macOS/Android/Windows
│   │   ├── sw.js                  # Service Worker receiving background web push notifications
│   │   └── icon.png               # Notification branding badge
│   └── package.json               # Frontend dependencies and Next.js scripts
```

---

## 🧠 Hybrid RAG (Retrieval-Augmented Generation)

HealthVault implements a **Hybrid RAG** retrieval system. By combining relational databases with vector semantic stores, it avoids the weaknesses of pure vector-based RAG pipelines.

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
      │ Exact facts (visits,  │       │ Unstructured clinical │
      │ lab values, dosages,  │       │ notes & free-text     │
      │ appointments)         │       │ doctor observations   │
      └───────────┬───────────┘       └───────────┬───────────┘
                  │                               │
                  └───────────────┬───────────────┘
                                  ▼
                    ┌───────────────────────────┐
                    │   Augmentation Pipeline   │
                    │    (prompt_builder.py)    │
                    └─────────────┬─────────────┘
                                  ▼
                    ┌───────────────────────────┐
                    │    Generation Engine      │
                    │   (openai/gpt-oss-120b)   │
                    └───────────────────────────┘
```

### 1. Structured Retrieval (`structured_retriever.py`)
Queries **PostgreSQL** directly. When a patient asks *"What is my Paracetamol dosage?"* or *"When is my next appointment?"*, vector search can return imprecise results. Structured retrieval fetches the exact clinical record values:
*   Exact Medication lists, statuses, and dosages.
*   Lab test reference values and flag labels (e.g. `borderline_high`).
*   Upcoming appointment calendars.

### 2. Semantic Retrieval (`semantic_retriever.py`)
Uses **ChromaDB vector store** (with sentence embeddings). When a patient asks about symptoms or clinical history (e.g. *"Why did Dr. Gupta prescribe antibiotics last month?"*), the system embeds the user query and conducts a cosine similarity search over unstructured doctor notes, returning the top matching contextual excerpts.

---

## ⚡ Automated Cognitive Pipelines

### 🛠️ The 3-Model Cascade Ingestion Pipeline
When a user uploads an image/PDF scan of a medical record, the system automates a multi-step cognitive pipeline:
1.  **Vision OCR Ingestion:** `ocr_extractor.py` calls the Groq vision model `qwen/qwen3.6-27b` to convert the raw document image into raw clinical text.
2.  **Structural Extraction:** `entity_structurer.py` sends the raw OCR text to `openai/gpt-oss-120b` to extract structured JSON schemas (Visit info, Patient metadata, Lab lists, Medication lists).
3.  **Database Synchronization:** The structured objects are inserted into the Supabase PostgreSQL DB, and the unstructured doctor notes are embedded and index-synced to ChromaDB in milliseconds.

### 💊 Clinical NLP Alarm Auto-Sync
Instead of requiring manual alarm creation, `postgres_client.py` uses rule-based NLP parser algorithms to read unstructured prescription frequencies and clinical timings, automatically mapping them to precise times and creating active database Alarms:
*   `"take twice daily after breakfast and at bedtime"` ➔ Auto-creates **09:00 AM** alarm (*"Take after breakfast"*) and **10:00 PM** alarm (*"Take at bedtime"*).
*   `"before lunch"` ➔ Auto-creates **01:00 PM** alarm (*"Take 30m before lunch"*).
*   `"after dinner"` ➔ Auto-creates **09:00 PM** alarm (*"Take after dinner"*).

### 🔔 Proactive OS-level Web Push Notification Engine
1.  **APScheduler** runs background tasks on the FastAPI server 24/7.
2.  `reminder_scheduler.py` runs every minute to check if an active medicine alarm is due.
3.  `notification_sender.py` signs a cryptographic VAPID push payload using the patient's subscription keys.
4.  The payload is sent to Google FCM / Apple APNs with **`Urgency: high`** and **`TTL: 86400`** headers. This forces Chrome/Safari to wake up the background Service Worker (`sw.js`) and display the **macOS OS Pop-up Banner Alert** instantly, even when the browser tab is closed.

---

## 📐 Key Architectural Decisions: Why RAG Instead of Fine-Tuning?

A primary design decision of HealthVault was using a **Hybrid SQL/Vector RAG architecture** rather than training or fine-tuning a custom Clinical LLM. 

Fine-tuning is popular, but was rejected for the following technical reasons:

| Technical Challenge | Fine-Tuning / Training | Hybrid RAG (HealthVault) |
|---|---|---|
| **Clinical Hallucinations** | High. Fine-tuned models hallucinate clinical data, leading to dangerous dosage errors. | Zero. Answers are strictly grounded in PostgreSQL facts. If data is missing, it states so. |
| **Dynamic Data Sync** | Requires expensive retraining or continuous fine-tuning cycles every time a new prescription is uploaded. | Real-time. Updates instantly via database inserts (`INSERT INTO ...`). |
| **Data Privacy (Multi-Tenancy)** | High leak risk. Patient A's private medical data could leak to Patient B through model weight adjustments. | Perfect Isolation. Data is isolated via standard SQL query filters (`patient_id = UUID`). |
| **Execution Cost & Hardware** | High. Requires GPU infrastructure (A100s/H100s) for training and high-throughput inference. | Extremely Low. Runs on standard CPU databases and serverless APIs in milliseconds. |

---

## 🛠️ Local Installation & Development

### 1. Prerequisites
Ensure you have **Python 3.10+** and **Node.js 18+** installed locally.

### 2. Environment Configurations
Create a `backend/.env` file:
```env
DATABASE_URL="postgresql://username:password@supabase-url.com:6543/postgres?sslmode=require"
GROQ_API_KEY="your-groq-api-key"
VAPID_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...base64...\n-----END PRIVATE KEY-----"
VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_CLAIMS_SUB="mailto:admin@healthvault.app"
```

Create a `frontend/.env.local` file:
```env
NEXT_PUBLIC_BACKEND_URL="http://localhost:8000"
```

### 3. Run Backend (FastAPI)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```
Backend will start on `http://localhost:8000` and sync database schemas.

### 4. Run Frontend (Next.js PWA)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` to interact with the application.
