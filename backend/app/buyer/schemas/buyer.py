from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class BuyerDashboardResponse(BaseModel):
    totalOutstanding: float = Field(..., description="Sum of outstanding active unpaid invoices")
    pendingApprovalsCount: int = Field(..., description="Count of invoices awaiting approval")
    totalApproved: float = Field(..., description="Total volume of approved invoices")
    totalRepaid: float = Field(..., description="Total volume of settled payments")

class BuyerInvoiceItem(BaseModel):
    id: str = Field(..., description="Unique Invoice ID")
    invoiceNumber: str = Field(..., description="Invoice unique number")
    sellerName: str = Field(..., description="Seller corporate name")
    buyerName: str = Field(..., description="Buyer corporate name")
    amount: float = Field(..., description="Invoice amount in INR")
    status: str = Field(..., description="Verification status: Approved, Rejected, Pending Approval, Settled")
    dueDate: str = Field(..., description="Repayment due date")
    createdAt: str = Field(..., description="Creation date")

class BuyerInvoicesResponse(BaseModel):
    invoices: List[BuyerInvoiceItem] = Field(default=[])
