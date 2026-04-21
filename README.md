# LifeLineAI – AI-Powered Health & Emergency Decision Assistant

LifeLineAI is a **multimodal, AI-assisted emergency decision-support system** built to help health workers and everyday bystanders make **faster, more informed choices** during routine medical situations and emergencies.

Users can submit incident details using **short video clips + a quick questionnaire**. The backend performs **computer-vision triage** (pose + motion + collapse likelihood + blood detection), then optionally enriches results using an **LLM (Groq)** to generate a structured emergency summary and step-by-step guidance.

In high-risk cases, the system supports **real-time alerting** to nearby responders via **Socket.IO**, with separate experiences for:
- **Patients / bystanders** (send SOS + get guidance)
- **Health officials** (priority visibility)
- **Volunteers** (opt-in and get matched by location)

> **Important:** LifeLineAI is a **decision-support tool**, not a replacement for professional medical judgment. If a situation is life-threatening or you’re unsure, contact your local emergency number immediately.

---

## What’s in this repository?

### Frontend (React + Vite + Tailwind)
Located in `frontend/`.

Key flows (routes in `frontend/src/router.jsx`):
- `/` → Auth gate (login/signup or continue as guest)
- `/emergency` → Record/upload a short SOS video clip
- `/questionnaire/:incidentId` → Quick triage questionnaire (conscious/breathing/hazards/location)
- `/guidance/:incidentId` → Displays AI-generated severity + steps + voice/TTS + chatbot overlay
- `/responder` → Responder console (official/volunteer) with real-time alerts

Frontend talks to the backend using:
- `VITE_API_BASE` from `frontend/.env` (default fallback: `http://localhost:5000`)

### Backend (Flask + Socket.IO + CV + Groq)
Located in `backend/`.

Main server: `backend/app.py`  
API health check: `GET /api/health`

Blueprints:
- `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/incidents` → upload incident video
- `POST /api/incidents/<id>/questionnaire`
- `POST /api/incidents/<id>/analyze` → CV + severity gate + optional LLM structured output
- `POST /api/incidents/<id>/chat` → LLM chatbot Q&A about the incident context
- `GET /api/incidents/<id>/report` → downloads a text incident report
- `POST /api/volunteers/opt-in` → volunteer availability + location text
- `POST /api/locations/update`, `GET /api/locations/me`, `GET /api/locations/nearby`

Real-time:
- Socket.IO server is initialized in `backend/socketio_server.py`
- Client registration is handled in `backend/realtime.py` (`register` event)
- Serious alerts are emitted from `backend/alerts.py`

AI modules (in `backend/ai/`):
- `pose_analysis.py` → MediaPipe pose landmarks → movement + torso angle + collapse likelihood summary
- `blood_detection.py` → estimates blood area ratio from frames (BGR heuristic)
- `severity_engine.py` → **hybrid severity gate** (rule-based severity: Low/Moderate/High/Critical)
- `serious_detection.py` → quick serious/not-serious classifier based on video-derived metrics
- `groq_service.py` → optional Groq LLM JSON-mode responses with robust JSON extraction
- `llm_prompts.py` / `json_extract.py` → structured prompting + parsing helpers

---

## Severity logic (high level)

The backend produces a severity level:
- **Low**
- **Moderate**
- **High**
- **Critical**

It uses:
1. **Video-derived metrics** (pose/motion/collapse + blood estimation)
2. **Questionnaire answers** (conscious/breathing/location/hazards)
3. A **hybrid severity gate** (rules + overrides)
4. Optional **LLM enrichment** (Groq), returning strict JSON with summary + reasoning + step list

If Groq is not configured, the system **falls back gracefully** with a minimal structured response.

---

## Prerequisites

- **Python 3.x** (recommended: 3.10+)
- **Node.js 18+** (recommended)
- **Groq API key** for LLM features

---

## Setup (Backend)

```bash
cd backend

python -m venv venv
# Windows (PowerShell)
.\venv\Scripts\Activate.ps1
# macOS/Linux
# source venv/bin/activate

pip install -r requirements.txt
```

Create `.env` (copy from example):

```bash
# in backend/
cp .env.example .env
```

Example `.env` fields:
- `SECRET_KEY`
- `PORT` (default 5000)
- `FRONTEND_URL` (default `http://localhost:5173`, used for CORS + Socket.IO origin checks)
- `GROQ_API_KEY` (optional but enables LLM)
- `GROQ_MODEL` (default in repo: `llama-3.3-70b-versatile`)
- `UPLOAD_DIR` (default: `uploads`)

Run backend:

```bash
python app.py
```

Production (Gunicorn + threaded worker):

```bash
gunicorn -w 1 --threads 8 -b 0.0.0.0:${PORT:-5000} app:app
```

Backend should be on: `http://localhost:5000`

---

## Setup (Frontend)

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend runs on: `http://localhost:5173`

---

## Run both (Windows PowerShell)

The repo includes a helper script:

```powershell
.\start-dev.ps1
```

This starts:
- Backend (`python app.py`)
- Frontend (`npm run dev`)

---

## Real-time alerts (how it works)

LifeLineAI uses Socket.IO for live updates:
- Frontend connects to the backend Socket.IO server (`frontend/src/lib/realtime.js`)
- Client emits `register` with either:
  - `token` (logged-in user)
  - `guest_id` (guest mode)
- Backend maps the socket to a **subject room** (`subject:<id>`)
- When a serious incident is detected, alerts can be emitted to:
  - The subject room (priority serious alerts)
  - Volunteers matched by location text in the demo logic

---

## API quick reference

Backend base: `http://localhost:5000`

- `GET /api/health`
- Auth:
  - `POST /api/auth/signup`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
- Incidents:
  - `POST /api/incidents` (multipart form-data: `video`, plus optional `guest_id`)
  - `POST /api/incidents/<incidentId>/questionnaire`
  - `POST /api/incidents/<incidentId>/analyze`
  - `POST /api/incidents/<incidentId>/chat`
  - `GET /api/incidents/<incidentId>/report`
- Volunteers:
  - `POST /api/volunteers/opt-in`
- Locations:
  - `POST /api/locations/update`
  - `GET /api/locations/me`
  - `GET /api/locations/nearby`

---
