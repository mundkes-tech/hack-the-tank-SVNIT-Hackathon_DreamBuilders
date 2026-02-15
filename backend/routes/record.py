"""
Record routes for handling video uploads and persistent storage.
PHASE 3A: Video Upload & Persistent Storage
PHASE 3B: Whisper Transcription
PHASE 3C: AI Highlight Extraction
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any
import json
import os
import subprocess
import time
from pathlib import Path

from database import get_db
from models import Campaign
from services.highlight_extractor import extract_highlights


# Load Whisper model once at module level (not per-request)
# Using "base" model for better accuracy with reasonable speed
# Models: tiny (39MB), base (74MB), small (244MB), medium (769MB), large (1550MB)
import whisper
print("[WHISPER] Loading Whisper model (base) on CPU...")
WHISPER_MODEL = whisper.load_model("base", device="cpu")
print("[WHISPER] Whisper model loaded successfully!")


router = APIRouter(prefix="/record", tags=["Record"])


# Response Models
class VideoUploadResponse(BaseModel):
    message: str
    transcript: str  # PHASE 3B: Whisper transcription result
    segment_count: int


class HighlightExtractionResponse(BaseModel):
    message: str
    highlight_count: int
    highlights: List[Dict[str, Any]]


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


def transcribe_audio_with_whisper(audio_path: Path) -> tuple[str, list]:
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
        start_time = time.time()
        
        result = WHISPER_MODEL.transcribe(str(audio_path), fp16=False)
        
        transcript = result.get("text", "").strip()
        segments = result.get("segments", [])
        
        duration = time.time() - start_time
        print(f"[WHISPER] Transcription complete: {len(transcript)} characters")
        print(f"[WHISPER] Transcription time: {duration:.2f}s")
        
        return transcript, segments
        
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
    
    # Avoid reprocessing if transcript and segments already exist
    if campaign.transcript and campaign.segments:
        return VideoUploadResponse(
            message="Video uploaded and transcribed successfully",
            transcript=campaign.transcript,
            segment_count=len(json.loads(campaign.segments))
        )

    # Step B: Transcribe audio using Whisper
    transcript, segments = transcribe_audio_with_whisper(audio_path)
    segments_json = json.dumps(segments)
    
    # Step C: Save transcript to database
    try:
        campaign.transcript = transcript
        campaign.segments = segments_json
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
        transcript=transcript,
        segment_count=len(segments)
    )


@router.post("/highlights/{campaign_id}", response_model=HighlightExtractionResponse)
def generate_highlights(
    campaign_id: str,
    db: Session = Depends(get_db)
):
    """
    Generate AI-powered highlight extraction for a campaign's transcript.
    
    PHASE 3C: Uses Groq to analyze transcript and segments,
    extracting 3-5 most impactful testimonial moments.
    
    Args:
        campaign_id: Unique campaign identifier
        db: Database session (dependency injection)
    
    Returns:
        HighlightExtractionResponse with highlights list
    
    Raises:
        404: If campaign not found
        400: If transcript or segments not available
        500: If highlight extraction fails
    """
    
    # Validate campaign exists
    campaign = get_campaign_or_404(campaign_id, db)
    
    # Ensure transcript exists
    if not campaign.transcript:
        raise HTTPException(
            status_code=400,
            detail="No transcript available. Please upload and transcribe video first."
        )
    
    # Ensure segments exist
    if not campaign.segments:
        raise HTTPException(
            status_code=400,
            detail="No segments available. Please upload and transcribe video first."
        )
    
    # Check if highlights already exist (avoid reprocessing)
    if campaign.highlights:
        print(f"[HIGHLIGHT] Highlights already exist for campaign: {campaign_id}")
        existing_highlights = json.loads(campaign.highlights)
        return HighlightExtractionResponse(
            message="Highlights already generated",
            highlight_count=len(existing_highlights.get("highlights", [])),
            highlights=existing_highlights.get("highlights", [])
        )
    
    # Deserialize segments
    try:
        segments = json.loads(campaign.segments)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse segments JSON: {str(e)}"
        )
    
    # Extract highlights using Groq
    try:
        print(f"[HIGHLIGHT] Extracting highlights for campaign: {campaign_id}")
        result = extract_highlights(campaign.transcript, segments)
        
        highlights = result.get("highlights", [])
        
        if not highlights:
            raise HTTPException(
                status_code=500,
                detail="No highlights were extracted"
            )
        
        # Save highlights to database
        highlights_json = json.dumps(result)
        campaign.highlights = highlights_json
        db.commit()
        db.refresh(campaign)
        print(f"[DATABASE] Highlights saved for campaign: {campaign_id}")
        
        return HighlightExtractionResponse(
            message="Highlights generated successfully",
            highlight_count=len(highlights),
            highlights=highlights
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[HIGHLIGHT] Error: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Highlight extraction failed: {str(e)}"
        )
