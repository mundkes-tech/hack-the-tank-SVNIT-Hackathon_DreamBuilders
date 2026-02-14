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
    """
    __tablename__ = "campaigns"
    
    id = Column(String, primary_key=True, index=True)
    prompt = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<Campaign(id={self.id}, prompt={self.prompt[:50]}...)>"
