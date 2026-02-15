"""
AI Highlight Extraction Service using Groq.
PHASE 3C: Extract 3-5 powerful testimonial highlights from transcript + segments.
"""
from services.ai_provider import call_groq_json


def extract_highlights(transcript: str, segments: list) -> dict:
    """
    Extract 3-5 powerful testimonial highlights using Groq.
    
    Args:
        transcript: Full transcribed text
        segments: List of segments with start, end, text keys
    
    Returns:
        dict with "highlights" key containing list of highlights:
        [
            {
                "text": "...",
                "start": 12.3,
                "end": 18.7,
                "reason": "Why this is impactful"
            }
        ]
    
    Falls back to longest segments if Groq fails.
    """
    
    # Validate inputs
    if not transcript or not segments:
        return {"highlights": []}
    
    # Build structured prompt for Groq
    segments_text = "\n".join([
        f"[{seg.get('start', 0):.1f}s - {seg.get('end', 0):.1f}s]: {seg.get('text', '')}"
        for seg in segments
    ])
    
    prompt = f"""You are an expert testimonial video editor. Analyze this video transcript and extract the 3-5 most powerful and impactful testimonial moments.

FULL TRANSCRIPT:
{transcript}

SEGMENTS WITH TIMESTAMPS:
{segments_text}

SELECT 3-5 HIGHLIGHTS that showcase:
- Measurable results or improvements
- Emotional impact and genuine enthusiasm
- Clear problem-solution statements
- Strong recommendation or endorsement statements
- Specific examples or stories

For each highlight:
1. Extract the exact text from the segment
2. Use the correct start and end timestamps
3. Explain why this moment is impactful

CRITICAL RULES:
- Return ONLY valid JSON
- No markdown formatting
- No code blocks
- No explanations outside JSON
- No numbering in the text

REQUIRED JSON FORMAT:
{{
  "highlights": [
    {{
      "text": "exact quote from segment",
      "start": 12.3,
      "end": 18.7,
      "reason": "explains measurable result"
    }}
  ]
}}

Generate the JSON now:"""
    
    try:
        print("[HIGHLIGHT] Calling Groq for highlight extraction...")

        data, _raw_text = call_groq_json(prompt, temperature=0.2)
        if data is None:
            raise ValueError("No JSON parsed from Groq response")
        
        # Validate structure
        if not isinstance(data, dict) or "highlights" not in data:
            raise ValueError("Invalid response structure")
        
        highlights = data["highlights"]
        if not isinstance(highlights, list) or not (3 <= len(highlights) <= 5):
            raise ValueError(f"Expected 3-5 highlights, got {len(highlights)}")
        
        # Validate each highlight has required fields
        for h in highlights:
            if not all(key in h for key in ["text", "start", "end", "reason"]):
                raise ValueError("Highlight missing required fields")
        
        print(f"[HIGHLIGHT] Successfully extracted {len(highlights)} highlights")
        return data
        
    except Exception as e:
        print(f"[HIGHLIGHT] Groq extraction failed: {str(e)}")
        print("[HIGHLIGHT] Falling back to longest segments...")
        
        # Fallback: Select top 3 longest segments
        sorted_segments = sorted(
            segments,
            key=lambda s: len(s.get("text", "")),
            reverse=True
        )[:3]
        
        fallback_highlights = [
            {
                "text": seg.get("text", ""),
                "start": seg.get("start", 0),
                "end": seg.get("end", 0),
                "reason": "Selected as one of the longest segments (fallback)"
            }
            for seg in sorted_segments
        ]
        
        return {"highlights": fallback_highlights}
