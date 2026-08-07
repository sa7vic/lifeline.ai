# LifeLineAI – AI-Powered Health & Emergency Decision Assistant

LifeLineAI is a **multimodal, AI-powered health and emergency decision-support platform** designed to help bystanders, volunteers, healthcare workers, and emergency officials make faster, more informed decisions during routine medical situations and emergencies.

Users can submit an incident using a **short video clip** along with a **quick triage questionnaire**. The backend analyzes the footage using computer vision techniques such as **pose estimation, motion analysis, collapse likelihood estimation, and blood detection** to assess the situation. Based on the analysis, the system can optionally use a **Groq-powered Large Language Model (LLM)** to generate a structured emergency summary, severity assessment, and step-by-step guidance.

For high-risk situations, LifeLineAI supports **real-time emergency alerting** and responder workflows using **Socket.IO**, enabling rapid communication between patients, volunteers, and health officials.

LifeLineAI provides dedicated experiences for:

* **Patients / Bystanders** – Submit SOS requests and receive AI-assisted emergency guidance.
* **Health Officials** – Monitor and prioritize emergency incidents.
* **Volunteers** – Opt in to receive and respond to nearby emergency alerts based on location.

> **Important:** LifeLineAI is a decision-support tool and is **not a replacement for professional medical judgment**. If a situation is life-threatening or you are unsure, contact your local emergency services immediately.

---

## Live Demo

**Frontend:** https://lifeline-ai-blush.vercel.app

---

## Features

* Video-based emergency incident reporting
* Short AI-assisted triage questionnaire
* Computer vision analysis using pose estimation, motion analysis, collapse likelihood detection, and blood detection
* Hybrid emergency severity assessment (Low, Moderate, High, Critical)
* Structured emergency summaries and guidance powered by Groq LLM
* Incident-aware chatbot for follow-up questions
* Incident report generation
* Real-time emergency alerts using Socket.IO
* Volunteer opt-in and nearby responder matching
* Role-based experiences for patients, volunteers, and health officials
* Multilingual frontend and backend localization
* Support for English, Hindi, and Arabic
* Right-to-left (RTL) support for Arabic

---

## What's in this Repository?

### Frontend (React + Vite + Tailwind CSS)

Located in `frontend/`.

The frontend provides dedicated interfaces for patients, volunteers, and responders.

#### Main Routes

| Route                        | Description                                                                |
| ---------------------------- | -------------------------------------------------------------------------- |
| `/`                          | Authentication (login, signup, or continue as guest)                       |
| `/emergency`                 | Record or upload an emergency video                                        |
| `/questionnaire/:incidentId` | Complete the triage questionnaire                                          |
| `/guidance/:incidentId`      | View AI-generated severity, emergency guidance, voice support, and chatbot |
| `/responder`                 | Real-time responder dashboard                                              |

The frontend communicates with the backend using the `VITE_API_BASE` environment variable (default: `http://localhost:5000`).

---

### Backend (Flask + Socket.IO + Computer Vision + Groq)

Located in `backend/`.

Main server:

`backend/app.py`

Health endpoint:

`GET /api/health`

#### Authentication

* `POST /api/auth/signup`
* `POST /api/auth/login`
* `GET /api/auth/me`

#### Incident APIs

* `POST /api/incidents`
* `POST /api/incidents/<id>/questionnaire`
* `POST /api/incidents/<id>/analyze`
* `POST /api/incidents/<id>/chat`
* `GET /api/incidents/<id>/report`

#### Volunteer APIs

* `POST /api/volunteers/opt-in`

#### Location APIs

* `POST /api/locations/update`
* `GET /api/locations/me`
* `GET /api/locations/nearby`

---

## AI Pipeline

LifeLineAI combines computer vision, rule-based reasoning, and an optional Large Language Model to analyze emergency incidents.

### Computer Vision Modules (`backend/ai/`)

* **pose_analysis.py** – Uses MediaPipe Pose to estimate body landmarks, movement, torso angle, and collapse likelihood.
* **blood_detection.py** – Estimates blood area ratio from video frames using color heuristics.
* **serious_detection.py** – Performs a quick serious/not-serious classification from video-derived metrics.
* **severity_engine.py** – Implements the hybrid severity engine to classify incidents as Low, Moderate, High, or Critical.
* **groq_service.py** – Generates structured emergency summaries and guidance using the Groq API.
* **llm_prompts.py** and **json_extract.py** – Handle prompt generation and structured JSON extraction.

---

## Severity Logic

The backend produces one of four severity levels:

* Low
* Moderate
* High
* Critical

Severity is determined using:

1. Video-derived metrics (pose, motion, collapse likelihood, blood estimation)
2. Questionnaire responses (consciousness, breathing, hazards, and location)
3. Hybrid rule-based severity logic with overrides
4. Optional Groq LLM enrichment that returns structured JSON containing a summary, reasoning, and recommended actions

If a Groq API key is not configured, the system automatically falls back to a minimal structured response.

---

## Multilingual Support

LifeLineAI includes a centralized internationalization and localization system across both the frontend and backend.

### Supported Languages

* English (`en`)
* Hindi (`hi`)
* Arabic (`ar`)

### Frontend

Frontend localization files are located in:

* `frontend/src/i18n/index.js`
* `frontend/src/i18n/config.js`
* `frontend/src/i18n/locales/en/translation.json`
* `frontend/src/i18n/locales/hi/translation.json`
* `frontend/src/i18n/locales/ar/translation.json`

Features include:

* Automatic browser language detection
* Manual language switching
* Persistent language selection using localStorage
* RTL layout support for Arabic
* Localized UI text, labels, and helper messages

### Backend

Backend localization is implemented using:

* `backend/i18n.py`
* `backend/locales/en.json`
* `backend/locales/hi.json`
* `backend/locales/ar.json`

Features include:

* Locale detection using `Accept-Language`, `X-Locale`, or `lang`
* English fallback for unsupported locales
* Localized API error messages
* Stable machine-readable error codes

---

## Real-Time Alerts

LifeLineAI uses Socket.IO for live communication between clients and responders.

* Clients register using either a user token or guest ID.
* The backend maps each client to a dedicated subject room.
* Critical incidents trigger real-time notifications.
* Volunteers can receive alerts based on location matching.

---

## API Reference

### Health

* `GET /api/health`

### Authentication

* `POST /api/auth/signup`
* `POST /api/auth/login`
* `GET /api/auth/me`

### Incidents

* `POST /api/incidents`
* `POST /api/incidents/<incidentId>/questionnaire`
* `POST /api/incidents/<incidentId>/analyze`
* `POST /api/incidents/<incidentId>/chat`
* `GET /api/incidents/<incidentId>/report`

### Volunteers

* `POST /api/volunteers/opt-in`

### Locations

* `POST /api/locations/update`
* `GET /api/locations/me`
* `GET /api/locations/nearby`
