"""
Record routes for handling video uploads and persistent storage.
PHASE 3A: Video Upload & Persistent Storage
PHASE 3B: Whisper Transcription
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os
import subprocess
from pathlib import Path

from database import get_db
from models import Campaign


# Load Whisper model once at module level (not per-request)
# Using "tiny" model for speed - perfect for demos/hackathon
# Models: tiny (39MB), base (74MB), small (244MB), medium (769MB), large (1550MB)
print("[WHISPER] Delaying Whisper model loading until first use...")
import whisper
WHISPER_MODEL = None  # Will be loaded on first transcription request


def load_whisper_model():
    """Lazy load Whisper model on first use"""
    global WHISPER_MODEL
    if WHISPER_MODEL is None:
        print("[WHISPER] Loading Whisper model (tiny)...")
        WHISPER_MODEL = whisper.load_model("tiny")
        print("[WHISPER] Whisper model loaded successfully!")
    return WHISPER_MODEL


router = APIRouter(prefix="/record", tags=["Record"])


# Response Models
class VideoUploadResponse(BaseModel):
    message: str
    video_path: str
    transcript: str  # PHASE 3B: Whisper transcription result


# Configuration
UPLOADS_DIR = Path("uploads")


def ensure_uploads_directory():
    """
    Ensure uploads directory exists.
    Creates it if not present.
    """
    UPLOADS_DIR.mkdir(exist_ok=True)


def get_campaign_or_404(campaign_id: str, db: Session):
    """
    Helper function to validate campaign exists.
    Raises 404 if campaign not found.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(
            status_code=404,
            detail=f"Campaign '{campaign_id}' not found"
        )
    return campaign


def extract_audio_from_video(video_path: Path, audio_path: Path) -> None:
    """
    Extract audio from video file using FFmpeg.
    
    PHASE 3B: Converts .webm video to .wav audio for Whisper transcription.
    
    Args:
        video_path: Path to input video file (.webm)
        audio_path: Path to output audio file (.wav)
    
    Raises:
        HTTPException: If FFmpeg extraction fails
    """
    try:
        # Try multiple FFmpeg paths (Scoop, system, portable)
        ffmpeg_paths = [
            "ffmpeg",  # System PATH
            str(Path.home() / "scoop" / "apps" / "ffmpeg" / "current" / "bin" / "ffmpeg.exe"),  # Scoop
            "C:\\ffmpeg\\bin\\ffmpeg.exe",  # Manual install
        ]
        
        print("[FFMPEG] Searching for FFmpeg executable...")
        ffmpeg_cmd = None
        for ffmpeg_path in ffmpeg_paths:
            try:
                print(f"[FFMPEG] Testing: {ffmpeg_path}")
                # Test if this ffmpeg path works
                test_result = subprocess.run(
                    [ffmpeg_path, "-version"],
                    capture_output=True,
                    timeout=5
                )
                if test_result.returncode == 0:
                    ffmpeg_cmd = ffmpeg_path
                    print(f"[FFMPEG] ✓ Using: {ffmpeg_cmd}")
                    break
                else:
                    print(f"[FFMPEG] ✗ Failed with return code: {test_result.returncode}")
            except Exception as e:
                print(f"[FFMPEG] ✗ Error testing {ffmpeg_path}: {type(e).__name__}")
                continue
        
        if not ffmpeg_cmd:
            print("[FFMPEG] ERROR: No working FFmpeg found!")
            raise HTTPException(
                status_code=500,
                detail="FFmpeg not found. Please install FFmpeg: https://ffmpeg.org/download.html"
            )
        
        # FFmpeg command: extract audio, no video stream
        # -i: input file
        # -vn: no video (audio only)
        # -y: overwrite output file if exists
        result = subprocess.run(
            [
                ffmpeg_cmd,
                "-i", str(video_path),
                "-vn",  # No video
                "-y",   # Overwrite
                str(audio_path)
            ],
            capture_output=True,
            text=True,
            timeout=60  # 60 second timeout for safety
        )
        
        if result.returncode != 0:
            print(f"[FFMPEG] Error: {result.stderr}")
            raise HTTPException(
                status_code=500,
                detail=f"FFmpeg audio extraction failed: {result.stderr[:200]}"
            )
        
        print(f"[FFMPEG] Audio extracted: {audio_path}")
        
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=500,
            detail="FFmpeg process timeout (>60s)"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Audio extraction error: {str(e)}"
        )


def transcribe_audio_with_whisper(audio_path: Path) -> str:
    """
    Transcribe audio file using Whisper AI.
    
    PHASE 3B: Lazy-loads Whisper model on first use for faster startup.
    
    Args:
        audio_path: Path to audio file (.wav)
    
    Returns:
        Transcribed text from audio
    
    Raises:
        HTTPException: If transcription fails
    """
    try:
        print(f"[WHISPER] Transcribing: {audio_path}")
        
        # Load model if not already loaded
        model = load_whisper_model()
        
        # Transcribe using model
        result = model.transcribe(str(audio_path))
        
        # Extract text from result
        transcript = result["text"].strip()
        
        print(f"[WHISPER] Transcription complete: {len(transcript)} characters")
        
        return transcript
        
    except Exception as e:
        print(f"[WHISPER] Transcription error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Whisper transcription failed: {str(e)}"
        )


@router.post("/upload/{campaign_id}", response_model=VideoUploadResponse)
async def upload_video(
    campaign_id: str,
    video: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload and save video recording for a campaign.
    
    PHASE 3A - Video Upload:
    - Validates campaign exists
    - Validates file is not empty
    - Saves video to backend/uploads/{campaign_id}.webm
    
    PHASE 3B - Whisper Transcription:
    - Extracts audio from video using FFmpeg
    - Transcribes audio using Whisper AI
    - Saves transcript to database
    - Returns transcript in response
    
    Args:
        campaign_id: Unique campaign identifier
        video: Video file uploaded from frontend (multipart/form-data)
        db: Database session (dependency injection)
    
    Returns:
        VideoUploadResponse with success message, video path, and transcript
    
    Raises:
        404: If campaign not found
        400: If video file is empty
        500: If FFmpeg or Whisper processing fails
    """
    
    # Validate campaign exists
    campaign = get_campaign_or_404(campaign_id, db)
    
    # Validate file is not empty
    if not video.file:
        raise HTTPException(
            status_code=400,
            detail="Video file is empty"
        )
    
    # Read video data
    try:
        video_data = await video.read()
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to read video file: {str(e)}"
        )
    
    # Validate data is not empty
    if not video_data or len(video_data) == 0:
        raise HTTPException(
            status_code=400,
            detail="Video file is empty"
        )
    
    # Ensure uploads directory exists
    ensure_uploads_directory()
    
    # Create video file path
    # File naming: {campaign_id}.webm
    video_filename = f"{campaign_id}.webm"
    video_path = UPLOADS_DIR / video_filename
    
    # Save video file to disk
    try:
        with open(video_path, "wb") as f:
            f.write(video_data)
        
        # Log success
        file_size_mb = len(video_data) / (1024 * 1024)
        print(f"[RECORD] Video saved: {video_path} ({file_size_mb:.2f} MB)")
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save video file: {str(e)}"
        )
    
    # ============================================================
    # PHASE 3B: WHISPER TRANSCRIPTION
    # ============================================================
    
    # Step A: Extract audio from video using FFmpeg
    audio_filename = f"{campaign_id}.wav"
    audio_path = UPLOADS_DIR / audio_filename
    
    extract_audio_from_video(video_path, audio_path)
    
    # Step B: Transcribe audio using Whisper
    transcript = transcribe_audio_with_whisper(audio_path)
    
    # Step C: Save transcript to database
    try:
        campaign.transcript = transcript
        db.commit()
        db.refresh(campaign)
        print(f"[DATABASE] Transcript saved for campaign: {campaign_id}")
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save transcript to database: {str(e)}"
        )
    
    # Optional: Clean up audio file to save disk space (keep video)
    try:
        if audio_path.exists():
            audio_path.unlink()
            print(f"[CLEANUP] Audio file removed: {audio_path}")
    except Exception as e:
        # Non-critical error - log but don't fail request
        print(f"[CLEANUP] Warning: Failed to remove audio file: {str(e)}")
    
    # Return success response with transcript
    return VideoUploadResponse(
        message="Video uploaded and transcribed successfully",
        video_path=f"uploads/{video_filename}",
        transcript=transcript
    )
