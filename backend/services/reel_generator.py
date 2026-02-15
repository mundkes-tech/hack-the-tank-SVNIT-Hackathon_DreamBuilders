"""
Automatic Reel Generation Service using MoviePy.
PHASE 3D: Generate final testimonial reel from extracted highlights.
"""
import json
import os
from pathlib import Path
from typing import Dict, List, Any
from moviepy.editor import VideoFileClip, concatenate_videoclips
from fastapi import HTTPException


# Configuration
UPLOADS_DIR = Path("uploads")
OUTPUTS_DIR = Path("outputs")


def ensure_output_directory():
    """
    Ensure outputs directory exists for storing generated reels.
    Creates it if not present.
    """
    OUTPUTS_DIR.mkdir(exist_ok=True)


def validate_highlight_timestamps(
    highlight: Dict[str, Any], 
    video_duration: float
) -> bool:
    """
    Validate that highlight timestamps are within valid range.
    Allows timestamps to slightly exceed video duration (within 1 second) to handle rounding errors.
    
    Args:
        highlight: Dictionary with 'start' and 'end' keys
        video_duration: Total video duration in seconds
    
    Returns:
        True if timestamps are valid, False otherwise
    """
    try:
        start = float(highlight.get("start", 0))
        end = float(highlight.get("end", 0))
        
        # Validate logical constraints
        if start < 0 or end < 0:
            print(f"[REEL] Invalid timestamp: negative values ({start}s - {end}s)")
            return False
        
        if start >= end:
            print(f"[REEL] Invalid timestamp: start >= end ({start}s - {end}s)")
            return False
        
        # Allow small overshoot (within 1 second) for rounding errors
        max_allowed = video_duration + 1.0
        if start > max_allowed:
            print(f"[REEL] Invalid timestamp: start exceeds video duration ({start}s > {video_duration}s)")
            return False
        
        return True
        
    except (ValueError, TypeError) as e:
        print(f"[REEL] Invalid timestamp format in highlight: {highlight} ({type(e).__name__})")
        return False


def generate_reel(campaign_id: str, highlights_json: str, video_path: Path) -> Dict[str, str]:
    """
    Generate final testimonial reel from video and highlights.
    
    PHASE 3D: Uses MoviePy to:
    - Load original video
    - Extract clips for each highlight
    - Concatenate clips in order
    - Save final reel as MP4
    
    Args:
        campaign_id: Unique campaign identifier
        highlights_json: JSON string containing highlights list
        video_path: Path to original video file
    
    Returns:
        Dictionary with:
        {
            "message": "Reel generated successfully",
            "reel_path": "outputs/final_{campaign_id}.mp4"
        }
    
    Raises:
        HTTPException: If generation fails (missing video, no highlights, etc.)
    """
    
    # Validate video file exists
    if not video_path.exists():
        raise HTTPException(
            status_code=400,
            detail=f"Original video file not found: {video_path}"
        )
    
    # Parse highlights JSON
    try:
        highlights_data = json.loads(highlights_json)
        highlights = highlights_data.get("highlights", [])
        print(f"[REEL] Parsed highlights: {len(highlights)} clips found")
        for i, h in enumerate(highlights):
            print(f"[REEL]   Clip {i+1}: {h.get('start')} - {h.get('end')} ({h.get('text', '')[:50]}...)")
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse highlights JSON: {str(e)}"
        )
    
    # Validate highlights exist
    if not highlights or len(highlights) == 0:
        raise HTTPException(
            status_code=400,
            detail="No highlights available to generate reel"
        )
    
    # Ensure output directory exists
    ensure_output_directory()
    
    # Load video file
    video = None
    try:
        print(f"[REEL] Loading video: {video_path}")
        video = VideoFileClip(str(video_path))
        video_duration = video.duration
        print(f"[REEL] Video loaded successfully (duration: {video_duration:.2f}s)")
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load video file: {str(e)}"
        )
    
    # Extract clips for each highlight
    clips = []
    valid_highlight_count = 0
    
    try:
        print(f"[REEL] Starting clip extraction from {len(highlights)} highlights...")
        for idx, highlight in enumerate(highlights, 1):
            # Validate timestamps
            if not validate_highlight_timestamps(highlight, video_duration):
                print(f"[REEL] ✗ Skipping highlight {idx}: timestamps invalid or out of range")
                continue
            
            try:
                start = float(highlight["start"])
                end = float(highlight["end"])
                
                # Clamp timestamps to valid range (handles rounding errors)
                start = max(0, start)
                end = min(video_duration, end)
                
                duration = end - start
                
                print(f"[REEL] → Extracting clip {idx}: {start:.3f}s - {end:.3f}s ({duration:.3f}s)")
                
                # Extract subclip
                clip = video.subclip(start, end)
                print(f"[REEL] ✓ Clip {idx} extracted (fps: {clip.fps}, duration: {clip.duration:.3f}s)")
                clips.append(clip)
                valid_highlight_count += 1
                
            except Exception as e:
                print(f"[REEL] ✗ Error extracting clip {idx}: {type(e).__name__}: {str(e)}")
                # Continue with next highlight instead of failing
                continue
        
        print(f"[REEL] Extraction complete: {valid_highlight_count}/{len(highlights)} clips extracted")
        
        # Validate at least one valid clip was extracted
        if not clips:
            raise HTTPException(
                status_code=400,
                detail="No valid highlight clips could be extracted from video"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing highlights: {str(e)}"
        )
    
    # Concatenate clips
    final_clip = None
    try:
        print(f"[REEL] Concatenating {len(clips)} clips...")
        final_clip = concatenate_videoclips(clips)
        print(f"[REEL] Concatenation complete (final duration: {final_clip.duration:.2f}s)")
        
    except Exception as e:
        # Clean up loaded clips
        for clip in clips:
            try:
                clip.close()
            except:
                pass
        raise HTTPException(
            status_code=500,
            detail=f"Failed to concatenate clips: {str(e)}"
        )
    
    # Write final reel to disk
    output_filename = f"final_{campaign_id}.mp4"
    output_path = OUTPUTS_DIR / output_filename
    
    try:
        print(f"[REEL] Writing final reel: {output_path}")
        
        # Use libx264 codec for MP4 output
        # fps=24 (common frame rate), audio_codec='aac' for audio
        final_clip.write_videofile(
            str(output_path),
            codec="libx264",
            audio_codec="aac",
            fps=24,
            verbose=False,
            logger=None  # Suppress moviepy verbose logging
        )
        
        print(f"[REEL] ✓ Reel generated successfully: {output_path}")
        
        return {
            "message": "Reel generated successfully",
            "reel_path": str(output_path)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to write reel to disk: {str(e)}"
        )
    
    finally:
        # Clean up video resources
        try:
            if final_clip:
                final_clip.close()
            video.close()
            
            # Clean up individual clips
            for clip in clips:
                try:
                    clip.close()
                except:
                    pass
            
            print("[REEL] Resource cleanup complete")
            
        except Exception as e:
            print(f"[REEL] Warning: Cleanup error: {str(e)}")
