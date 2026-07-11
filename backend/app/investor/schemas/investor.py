from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class SettlementScheduleItem(BaseModel):
    invoiceId: str = Field(..., description="Unique Invoice ID")
    buyerName: str = Field(..., description="Name of the buyer paying")
    amount: float = Field(..., description="Due repayment amount")
    dueDate: str = Field(..., description="Repayment due date")

class InvestorDashboardResponse(BaseModel):
    portfolioValue: float = Field(..., description="Total value of funded active investments + wallet balance")
    totalInvested: float = Field(..., description="Total capital actively deployed in invoices")
    expectedReturns: float = Field(..., description="Expected profit yield from active investments")
    avgYield: float = Field(..., description="Weighted average expected yield APY (%)")
    activeCount: int = Field(..., description="Count of active investments")
    completedCount: int = Field(..., description="Count of settled/completed investments")
    walletBalance: float = Field(..., description="Available wallet balance to bid")
    settlementSchedule: List[SettlementScheduleItem] = Field(default=[], description="Upcoming repayments schedule")

class InvestorPortfolioItem(BaseModel):
    id: str = Field(..., description="Unique Investment/Invoice ID")
    buyerName: str = Field(..., description="Buyer corporate legal name")
    amount: float = Field(..., description="Funded capital amount")
    yieldRate: float = Field(..., description="Annual expected yield APY (%)")
    status: str = Field(..., description="Status (Active, Completed, Pending)")
    dueDate: str = Field(..., description="Repayment due date")

class InvestorPortfolioResponse(BaseModel):
    investments: List[InvestorPortfolioItem] = Field(default=[])
    sectorAllocation: List[Dict[str, Any]] = Field(default=[])

class TransactionItem(BaseModel):
    id: str = Field(..., description="Unique transaction event ID")
    type: str = Field(..., description="Event Type: Deposit, Bid Placed, Funding Settle, Repayment Payout")
    amount: float = Field(..., description="Transaction volume in INR")
    timestamp: str = Field(..., description="ISO timestamp")
    description: str = Field(..., description="Human readable context description")

class InvestorPerformanceResponse(BaseModel):
    roiHistory: List[Dict[str, Any]] = Field(default=[], description="Historical portfolio growth metrics (month-by-month)")
    avgYieldRate: float = Field(..., description="Weighted average ROI rate")
