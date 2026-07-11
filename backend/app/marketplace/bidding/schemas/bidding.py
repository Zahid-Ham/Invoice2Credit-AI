from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class BidCreateRequest(BaseModel):
    investorId: str = Field(..., description="Unique UID of the authenticated investor")
    bidAmount: float = Field(..., description="Amount being bid on the invoice")
    expectedYield: float = Field(..., description="Expected Yield APY (%)")

class BidResponse(BaseModel):
    id: str = Field(..., description="Unique Bid ID")
    investorId: str = Field(..., description="UID of the investor")
    investorName: str = Field(..., description="Display name of the investor")
    listingId: str = Field(..., description="Unique listing identifier")
    bidAmount: float = Field(..., description="Bid amount in INR")
    expectedYield: float = Field(..., description="Expected Yield APY (%)")
    timestamp: str = Field(..., description="ISO 8601 Timestamp of bid placement")
    status: str = Field(..., description="Status of the bid (e.g. Lead, Outbid, Funded)")

class InvestmentResponse(BaseModel):
    id: str = Field(..., description="Unique investment ID")
    investorId: str = Field(..., description="UID of the investor")
    listingId: str = Field(..., description="Listing ID")
    invoiceId: str = Field(..., description="Invoice ID")
    buyerName: str = Field(..., description="Buyer corporate name")
    amount: float = Field(..., description="Total funded investment amount")
    yieldRate: float = Field(..., description="Finalized Yield APY (%)")
    settlementDate: str = Field(..., description="Settlement or Due Date")
    status: str = Field("Active", description="Investment status (e.g. Active, Completed)")
    timestamp: str = Field(..., description="Creation timestamp")
