"""
Database models for the testimonial collection system.
"""
from sqlalchemy import Column, String, Text, DateTime
from datetime import datetime
from database import Base


class Campaign(Base):
    """
    Campaign model for storing testimonial collection campaigns.
    Each campaign has a unique ID and a prompt describing what testimonial to collect.
    
    PHASE 3B: Added transcript, segments, and highlights fields for AI processing.
    """
    __tablename__ = "campaigns"
    
    id = Column(String, primary_key=True, index=True)
    prompt = Column(Text, nullable=False)
    transcript = Column(Text, nullable=True)  # PHASE 3B: Whisper transcription
    segments = Column(Text, nullable=True)  # PHASE 3B: JSON string of segments
    highlights = Column(Text, nullable=True)  # PHASE 3C: JSON string of highlights
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<Campaign(id={self.id}, prompt={self.prompt[:50]}...)>"
