"""
Campaign routes for creating and retrieving testimonial campaigns.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import uuid

from database import get_db
from models import Campaign


router = APIRouter(prefix="/campaign", tags=["Campaign"])


# Request/Response Models
class CreateCampaignRequest(BaseModel):
    prompt: str


class CreateCampaignResponse(BaseModel):
    campaign_id: str
    shareable_link: str
    prompt: str
    created_at: str


class GetCampaignResponse(BaseModel):
    campaign_id: str
    prompt: str
    created_at: str


@router.post("/create", response_model=CreateCampaignResponse)
def create_campaign(
    request: CreateCampaignRequest,
    db: Session = Depends(get_db)
):
    """
    Create a new testimonial campaign.
    
    - Generates a unique UUID for the campaign
    - Stores the campaign prompt in the database
    - Returns the campaign ID and shareable link
    """
    # Generate unique campaign ID
    campaign_id = str(uuid.uuid4())
    
    # Create campaign object
    campaign = Campaign(
        id=campaign_id,
        prompt=request.prompt
    )
    
    # Save to database
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    
    # Generate shareable link
    # In production, this would be your actual domain
    shareable_link = f"http://localhost:5173/collect/{campaign_id}"
    
    return CreateCampaignResponse(
        campaign_id=campaign.id,
        shareable_link=shareable_link,
        prompt=campaign.prompt,
        created_at=campaign.created_at.isoformat()
    )


@router.get("/{campaign_id}", response_model=GetCampaignResponse)
def get_campaign(
    campaign_id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieve a campaign by its ID.
    
    - Fetches campaign from database
    - Returns campaign details including prompt
    """
    # Query database for campaign
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    
    # Check if campaign exists
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return GetCampaignResponse(
        campaign_id=campaign.id,
        prompt=campaign.prompt,
        created_at=campaign.created_at.isoformat()
    )
