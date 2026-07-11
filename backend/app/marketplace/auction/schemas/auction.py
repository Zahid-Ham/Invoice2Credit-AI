from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class AuctionStartRequest(BaseModel):
    invoiceId: str = Field(..., description="The unique invoice ID to start an auction for")
    durationHours: int = Field(24, ge=1, description="Auction duration in hours")

class AuctionCloseRequest(BaseModel):
    auctionId: str = Field(..., description="The unique auction ID to close")

class AuctionResponse(BaseModel):
    id: str = Field(..., description="Unique Auction ID")
    invoiceId: str = Field(..., description="Associated Invoice ID")
    status: str = Field(..., description="Auction State: Draft, Live, Fully Funded, Closed, Cancelled")
    startTime: str = Field(..., description="ISO 8601 Start Timestamp")
    endTime: str = Field(..., description="ISO 8601 End Timestamp")
    fundingProgress: float = Field(..., description="Funding percentage (0-100)")
    investorCount: int = Field(..., description="Number of unique bidding investors")
    amount: float = Field(..., description="Goal amount in INR")
    highestBid: float = Field(..., description="Current highest bid amount")
    winningBid: Optional[float] = Field(None, description="Winning bid amount at closure")
    timeRemaining: str = Field(..., description="Human readable time remaining")
    createdAt: str = Field(..., description="Creation timestamp")
    updatedAt: str = Field(..., description="Last update timestamp")
