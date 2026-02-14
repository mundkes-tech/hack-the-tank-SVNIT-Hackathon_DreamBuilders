# Backend - AI Testimonial Collection System

## Phase 1: Campaign + Link System

This is the backend for the AI-Native Autonomous Testimonial Collection System.

### Setup Instructions

1. **Create a virtual environment:**
```bash
python -m venv venv
```

2. **Activate the virtual environment:**
```bash
# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Run the server:**
```bash
python main.py
```

Or use uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### API Endpoints

#### Health Check
- `GET /` - Root endpoint with system info
- `GET /health` - Health check

#### Campaign Management
- `POST /campaign/create` - Create a new testimonial campaign
  - Request: `{ "prompt": "Collect testimonial for my pizza restaurant" }`
  - Response: Campaign ID and shareable link

- `GET /campaign/{campaign_id}` - Retrieve campaign details
  - Response: Campaign ID, prompt, and creation timestamp

### Project Structure

```
backend/
├── main.py          # FastAPI app entry point
├── database.py      # Database configuration
├── models.py        # SQLAlchemy models
├── routes/
│   ├── __init__.py
│   └── campaign.py  # Campaign endpoints
└── requirements.txt # Python dependencies
```

### Database

- SQLite database stored as `testimonials.db`
- Automatically initialized on startup
- Campaign table with id, prompt, and created_at fields

### Testing

You can test the API using:
- FastAPI automatic docs at `http://localhost:8000/docs`
- ReDoc at `http://localhost:8000/redoc`
- cURL, Postman, or any HTTP client

Example cURL command:
```bash
curl -X POST "http://localhost:8000/campaign/create" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Collect testimonial for my pizza restaurant"}'
```
