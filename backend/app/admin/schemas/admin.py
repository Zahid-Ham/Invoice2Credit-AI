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
    totalInvoiceFaceValue: float = Field(..., description="Total Invoice Face Value in INR")
    totalOnChainFunding: float = Field(..., description="Total Confirmed On-Chain Funding in POL")
    totalOnChainSettlements: float = Field(..., description="Total Confirmed Settlements in POL")
    activeFinancingRequestsCount: int = Field(..., description="Active Financing Requests count")
    financingDisbursedCount: int = Field(..., description="Financing Disbursed count")
    settledInvoicesCount: int = Field(..., description="Settled Invoices count")
    activeUsersCount: int = Field(..., description="Total active users")
    fraudAlertsCount: int = Field(..., description="Count of potential risk/fraud flags")
    systemHealth: str = Field("Healthy", description="Status parameter representing system health")
