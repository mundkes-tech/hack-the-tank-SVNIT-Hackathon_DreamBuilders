# Backend - AI Testimonial Collection System

FastAPI backend for campaign creation, question generation, video upload/transcription, highlight extraction, and final reel generation.

## Quick Start

1. Create and activate virtual environment:
```bash
python -m venv .venv

# Windows (PowerShell)
.venv\Scripts\Activate.ps1

# Mac/Linux
source .venv/bin/activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create environment file:
```bash
copy .env.example .env
```

4. Set your Groq key in `.env`:
```env
GROQ_API_KEY=your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_BASE_URL=https://api.groq.com/openai/v1
```

5. Run server:
```bash
python main.py
```

Server base URL: `http://127.0.0.1:8001`

## API Docs

- Swagger UI: `http://127.0.0.1:8001/docs`
- ReDoc: `http://127.0.0.1:8001/redoc`

## Endpoints

### Health
- `GET /`
- `GET /health`

### Campaign
- `POST /campaign/create`
- `GET /campaign/{campaign_id}`
- `POST /campaign/{campaign_id}/generate-questions`

`POST /campaign/create`
```json
{
  "prompt": "Collect testimonial for our onboarding and support experience"
}
```

`POST /campaign/{campaign_id}/generate-questions`
```json
{
  "language": "english"
}
```

Supported language values: `english`, `hindi`

### Record
- `POST /record/upload/{campaign_id}`
- `POST /record/highlights/{campaign_id}`
- `GET /record/edited-highlights/{campaign_id}`
- `POST /record/edited-highlights/{campaign_id}`
- `POST /record/logo/{campaign_id}`
- `GET /record/logo/{campaign_id}`
- `POST /record/music/{campaign_id}`
- `GET /record/music/{campaign_id}`
- `POST /record/generate-reel/{campaign_id}`
- `GET /record/reel/{campaign_id}`

`POST /record/upload/{campaign_id}`
- Content type: `multipart/form-data`
- Form field: `video` (`.webm`)
- Returns transcript text and segment count.

`POST /record/highlights/{campaign_id}`
- Generates AI highlights from transcript and Whisper segments.

`POST /record/edited-highlights/{campaign_id}`
```json
{
  "highlights": [
    {
      "text": "Strong recommendation segment",
      "start": 45.2,
      "end": 57.1,
      "reason": "Manual edit"
    }
  ]
}
```

`POST /record/logo/{campaign_id}`
- Content type: `multipart/form-data`
- Form field: `logo`
- Allowed: `png`, `jpg`, `jpeg`, `webp`

`POST /record/music/{campaign_id}`
- Content type: `multipart/form-data`
- Form field: `music`
- Allowed: `mp3`, `wav`, `m4a`

`POST /record/generate-reel/{campaign_id}`
```json
{
  "aspect_ratio": "landscape",
  "add_subtitles": true,
  "add_background_music": false,
  "bgm_volume": 0.2,
  "ducking_strength": 0.35
}
```

Aspect ratio values: `landscape`, `portrait`, `square`

## Common Errors

- `400`: Invalid input (unsupported media type, invalid highlight range, missing transcript)
- `404`: Campaign or requested media file not found
- `500`: AI/FFmpeg/MoviePy internal processing failure

## Notes

- Database file is `testimonials.db` (SQLite).
- Uploads are stored under `uploads/`, logos under `logos/`, music under `music/`, and generated reels under `outputs/`.
- CORS is configured for frontend dev server at `http://localhost:5173` and `http://127.0.0.1:5173`.
