from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class VerifyBusinessRequest(BaseModel):
    userId: str = Field(..., description="Unique UID of the business/user to verify")
    verified: bool = Field(True, description="KYC status")

class SuspendUserRequest(BaseModel):
    userId: str = Field(..., description="Unique UID of the user to suspend")
    suspend: bool = Field(True, description="Suspension state")

class ApproveListingRequest(BaseModel):
    listingId: str = Field(..., description="The unique listing/invoice ID to approve")
    approve: bool = Field(True, description="Manual approval flag")

class AdminDashboardResponse(BaseModel):
    totalTransactionsValue: float = Field(..., description="Total volume of financing transacted")
    activeUsersCount: int = Field(..., description="Total active users")
    listedInvoicesVolume: float = Field(..., description="Total volume of listed invoices")
    activeAuctionsCount: int = Field(..., description="Number of active live auctions")
    fraudAlertsCount: int = Field(..., description="Count of potential risk/fraud flags")
    systemHealth: str = Field("Healthy", description="Status parameter representing system health")
