"""
Automatic Reel Generation Service using MoviePy.
PHASE 3D: Generate final testimonial reel from extracted highlights.
PHASE 3E: Add subtitles, logo watermark, and aspect ratio conversion.
"""
import json
import os
from pathlib import Path
from typing import Dict, List, Any, Optional
from moviepy.editor import (
    VideoFileClip, 
    concatenate_videoclips, 
    TextClip, 
    CompositeVideoClip,
    ImageClip
)
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


def add_subtitles_to_clip(clip: VideoFileClip, segments: List[Dict], clip_start_time: float) -> VideoFileClip:
    """
    PHASE 3E: Add subtitles to a video clip based on Whisper segments.
    
    Args:
        clip: Video clip to add subtitles to
        segments: Whisper transcription segments with start, end, text
        clip_start_time: Start time of this clip in the original video
    
    Returns:
        Video clip with subtitles overlaid
    """
    try:
        clip_end_time = clip_start_time + clip.duration
        subtitle_clips = []
        
        # Find segments that overlap with this clip
        for segment in segments:
            seg_start = float(segment.get("start", 0))
            seg_end = float(segment.get("end", 0))
            text = segment.get("text", "").strip()
            
            if not text:
                continue
            
            # Check if segment overlaps with clip timeframe
            if seg_end < clip_start_time or seg_start > clip_end_time:
                continue
            
            # Adjust segment timing relative to clip
            subtitle_start = max(0, seg_start - clip_start_time)
            subtitle_end = min(clip.duration, seg_end - clip_start_time)
            subtitle_duration = subtitle_end - subtitle_start
            
            if subtitle_duration <= 0:
                continue
            
            # Create subtitle text clip
            txt_clip = TextClip(
                text,
                fontsize=40,
                color='white',
                font='Arial-Bold',
                stroke_color='black',
                stroke_width=2,
                method='caption',
                size=(clip.w - 100, None),  # Leave margins
                align='center'
            )
            
            # Position at bottom center
            txt_clip = txt_clip.set_position(('center', clip.h - 150))
            txt_clip = txt_clip.set_start(subtitle_start)
            txt_clip = txt_clip.set_duration(subtitle_duration)
            
            subtitle_clips.append(txt_clip)
        
        # If subtitles exist, composite them onto the video
        if subtitle_clips:
            return CompositeVideoClip([clip] + subtitle_clips)
        return clip
        
    except Exception as e:
        print(f"[REEL] Warning: Failed to add subtitles: {str(e)}")
        return clip  # Return original clip if subtitles fail


def add_logo_watermark(clip: VideoFileClip, logo_path: Optional[Path]) -> VideoFileClip:
    """
    PHASE 3E: Add logo watermark to bottom-right corner.
    
    Args:
        clip: Video clip to add logo to
        logo_path: Path to logo image file (PNG recommended for transparency)
    
    Returns:
        Video clip with logo watermark
    """
    if not logo_path or not logo_path.exists():
        return clip
    
    try:
        # Load logo image
        logo = ImageClip(str(logo_path))
        
        # Resize logo to 10% of video width (maintain aspect ratio)
        logo_width = int(clip.w * 0.1)
        logo = logo.resize(width=logo_width)
        
        # Position at bottom-right with 20px padding
        logo = logo.set_position((clip.w - logo.w - 20, clip.h - logo.h - 20))
        logo = logo.set_duration(clip.duration)
        
        # Composite logo onto video
        return CompositeVideoClip([clip, logo])
        
    except Exception as e:
        print(f"[REEL] Warning: Failed to add logo watermark: {str(e)}")
        return clip  # Return original clip if logo fails


def convert_aspect_ratio(clip: VideoFileClip, aspect_ratio: str) -> VideoFileClip:
    """
    PHASE 3E: Convert video to specified aspect ratio.
    
    Args:
        clip: Video clip to convert
        aspect_ratio: 'landscape' (16:9), 'portrait' (9:16), or 'square' (1:1)
    
    Returns:
        Video clip with converted aspect ratio
    """
    try:
        original_w, original_h = clip.w, clip.h
        
        if aspect_ratio == 'portrait':
            # 9:16 (vertical - Instagram/TikTok)
            target_ratio = 9 / 16
            target_h = original_h
            target_w = int(target_h * target_ratio)
            
        elif aspect_ratio == 'square':
            # 1:1 (square - Instagram)
            target_size = min(original_w, original_h)
            target_w = target_h = target_size
            
        else:  # landscape (default)
            # 16:9 (horizontal - YouTube)
            return clip  # Most videos are already 16:9
        
        # Center crop to target aspect ratio
        if target_w < original_w or target_h < original_h:
            x_center = original_w / 2
            y_center = original_h / 2
            x1 = int(x_center - target_w / 2)
            y1 = int(y_center - target_h / 2)
            
            return clip.crop(x1=x1, y1=y1, width=target_w, height=target_h)
        
        return clip
        
    except Exception as e:
        print(f"[REEL] Warning: Failed to convert aspect ratio: {str(e)}")
        return clip  # Return original clip if conversion fails


def generate_reel(
    campaign_id: str, 
    highlights_json: str, 
    video_path: Path,
    segments_json: Optional[str] = None,
    aspect_ratio: str = "landscape",
    logo_path: Optional[Path] = None
) -> Dict[str, str]:
    """
    Generate final testimonial reel from video and highlights.
    
    PHASE 3D: Uses MoviePy to:
    - Load original video
    - Extract clips for each highlight
    - Concatenate clips in order
    - Save final reel as MP4
    
    PHASE 3E: Enhanced with:
    - Auto-subtitles from Whisper segments
    - Logo watermark overlay
    - Aspect ratio conversion (landscape/portrait/square)
    
    Args:
        campaign_id: Unique campaign identifier
        highlights_json: JSON string containing highlights list
        video_path: Path to original video file
        segments_json: Optional JSON string with Whisper segments for subtitles
        aspect_ratio: 'landscape', 'portrait', or 'square' (default: 'landscape')
        logo_path: Optional path to logo image for watermark
    
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
    
    # Parse segments for subtitles (PHASE 3E)
    segments = []
    if segments_json:
        try:
            segments = json.loads(segments_json)
            print(f"[REEL] Loaded {len(segments)} segments for subtitles")
        except json.JSONDecodeError:
            print("[REEL] Warning: Failed to parse segments JSON, proceeding without subtitles")
    
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
                
                # PHASE 3E: Apply customizations
                # 1. Convert aspect ratio
                if aspect_ratio != "landscape":
                    print(f"[REEL] ↻ Converting clip {idx} to {aspect_ratio} aspect ratio...")
                    clip = convert_aspect_ratio(clip, aspect_ratio)
                
                # 2. Add subtitles if segments available
                if segments:
                    print(f"[REEL] ✏ Adding subtitles to clip {idx}...")
                    clip = add_subtitles_to_clip(clip, segments, start)
                
                # 3. Add logo watermark if provided
                if logo_path:
                    print(f"[REEL] 🏷 Adding logo watermark to clip {idx}...")
                    clip = add_logo_watermark(clip, logo_path)
                
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
