# Namuste AI — Hybrid Voice & Chat Calling Platform

A real-time, multilingual AI Voice & Chat Calling Engine built with Next.js 16, Sarvam AI (Vernacular STT & TTS), OpenAI GPT-4o-mini (with Gemini failover), deterministic FSMs, and anti-hallucination guardrails.

---

## 🚀 Key Industry Verticals

### 1. Automobile & Dealership Agent (`Apex Motors`)
- **Sales Discovery & Catalog**: 8 verified Indian vehicle models (Creta, Nexon, Nexon EV, Brezza, XUV700, Thar, City, Swift) with real price bounds, fuel types, transmission choices, and budget matching.
- **Dealership Network**: 4 Delhi-NCR workshops (Gurgaon Central, South Delhi Okhla, Noida Sector 63, West Delhi) with real operating hours and slot capacities.
- **DMS Job Card Tracking**: Instant mock service status lookup via registration number or phone (`getJobCardStatus`).
- **Transparent Service Estimates**: Indicative pricing breakdown by model & service type (`getServiceEstimate`).
- **Emergency Roadside Assistance**: 24/7 hotline dispatch protocol for highway breakdowns, towing, and engine overheating.
- **Deterministic Booking Guardrails**: Genuinely completes bookings only when name, 10-digit mobile, vehicle plate/model, workshop location, and operating hours slot pass verification.

### 2. Doctors & Clinics Agent (`Sunshine Clinic Complex`)
- **Multi-Specialty OPD & Diagnostics**: General Medicine, Cardiology, Orthopedics, Dermatology, ENT, Pediatrics, General Dentistry, Pathology/Blood Tests, and Imaging.
- **Doctor Rostering**: Doctor schedule enforcement and slot hours validation.
- **Medical Emergency Triage**: Instant redirection to 112/hospital for acute emergencies.

---

## 🎙️ Voice & Audio Infrastructure

- **VAD & Barge-In**: Real-time client-side Voice Activity Detection with live interruption handling.
- **Sarvam AI STT & TTS**: Multilingual speech recognition and neural voice synthesis across 10 Indian languages (`en-IN`, `hi-IN`, `ta-IN`, `te-IN`, `kn-IN`, `ml-IN`, `bn-IN`, `pa-IN`, `gu-IN`, `mr-IN`).
- **Streaming NDJSON Audio**: Sentence-level pre-warmed TTS streamed as chunked NDJSON for low-latency voice responses.
- **Language Stickiness**: Dynamic turn-by-turn vernacular script detection with threshold-based anchor protection.

---

## ⚙️ Environment Variables (Vercel Configuration)

Configure these environment variables in your Vercel Project Settings (`Settings` → `Environment Variables`):

| Variable | Description | Required |
| :--- | :--- | :--- |
| `OPENAI_API_KEY` | OpenAI API Key (used for GPT-4o-mini conversation & entity extraction) | **Yes** |
| `SARVAM_API_KEY` | Sarvam AI API Key (used for speech-to-text transcription and text-to-speech synthesis) | **Yes** |
| `GEMINI_API_KEY` | Google Gemini API Key (failover LLM if OpenAI is unavailable or rate-limited) | Optional |
| `AUTOMOBILE_WEBHOOK_URL` | Destination webhook endpoint for Automobile Service & Test Drive bookings | Optional |
| `AI_DEMO_WEBHOOK_URL` | General CRM / automation webhook endpoint for lead captures | Optional |

---

## 🛠️ Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/dsankush/namsute_voice_ai_module.git
   cd namsute_voice_ai_module
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.local.example .env.local
   # Add your OPENAI_API_KEY and SARVAM_API_KEY to .env.local
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Type check & build**:
   ```bash
   npx tsc --noEmit
   npm run lint
   npm run build
   ```
