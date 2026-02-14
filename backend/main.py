"""
Main FastAPI application for AI-Native Autonomous Testimonial Collection System.
Phase 1: Campaign + Link System
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routes.campaign import router as campaign_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan event handler for startup and shutdown.
    Replaces deprecated on_event.
    """
    # Startup
    print("Initializing database...")
    init_db()
    print("Database initialized successfully!")
    yield
    # Shutdown (if needed in future)
    pass


# Create FastAPI app
app = FastAPI(
    title="AI Testimonial Collection System",
    description="Autonomous system for collecting and processing video testimonials",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(campaign_router)


@app.get("/")
def root():
    """
    Health check endpoint.
    """
    return {
        "message": "AI Testimonial Collection System API",
        "status": "running",
        "phase": "1 - Campaign + Link System"
    }


@app.get("/health")
def health_check():
    """
    Health check endpoint for monitoring.
    """
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
