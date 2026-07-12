from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime

class InvoiceBase(BaseModel):
    invoiceNumber: str = Field(..., description="Unique invoice identifier from the issuer")
    invoiceDate: str = Field(..., description="Date of invoice issuance in YYYY-MM-DD format")
    dueDate: str = Field(..., description="Payment due date in YYYY-MM-DD format")
    invoiceAmount: float = Field(..., description="Total amount of the invoice")
    currency: str = Field("INR", description="Three-letter currency code (e.g., INR, USD)")
    sellerName: str = Field(..., description="Legal name of the selling entity")
    sellerGST: str = Field(..., description="15-character GSTIN of the seller")
    buyerName: str = Field(..., description="Legal name of the buying entity")
    buyerGST: str = Field(..., description="15-character GSTIN of the buyer")
    buyerCompany: str = Field(..., description="Registered company name of the buyer")
    industry: str = Field("RETAIL", description="Sector classification of the transaction (e.g. TEXTILES, RETAIL)")

class InvoiceCreate(InvoiceBase):
    pass

class InvoiceUpdate(BaseModel):
    invoiceNumber: Optional[str] = None
    invoiceDate: Optional[str] = None
    dueDate: Optional[str] = None
    invoiceAmount: Optional[float] = None
    currency: Optional[str] = None
    sellerName: Optional[str] = None
    sellerGST: Optional[str] = None
    buyerName: Optional[str] = None
    buyerGST: Optional[str] = None
    buyerCompany: Optional[str] = None
    industry: Optional[str] = None
    invoiceStatus: Optional[str] = None
    verificationStatus: Optional[str] = None
    duplicateStatus: Optional[str] = None
    marketplaceStatus: Optional[str] = None
    blockchainStatus: Optional[str] = None
    riskScore: Optional[float] = None

class InvoiceResponse(InvoiceBase):
    invoiceId: str
    invoiceStatus: str
    invoicePDFUrl: str
    invoiceHash: str
    riskScore: Optional[float] = 0.0
    verificationStatus: str
    duplicateStatus: str
    marketplaceStatus: str
    blockchainStatus: str
    createdBy: str
    createdAt: str
    updatedAt: str

    # AI Invoice Intelligence Phase 1 additions
    extractionStatus: Optional[str] = "PENDING"
    extractedInvoice: Optional[Dict] = None
    validationStatus: Optional[str] = "PENDING"
    validationSignals: Optional[List] = None
    duplicateSignals: Optional[List] = None
    aiAnalysisStatus: Optional[str] = "PENDING"
    aiRiskAnalysis: Optional[Dict] = None
    riskLevel: Optional[str] = "LOW"
    riskSignals: Optional[List] = None
    analysisVersion: Optional[str] = "invoice-risk-v1"
    analyzedAt: Optional[str] = None
    verifierDecision: Optional[str] = "PENDING"
    verifierDecisionReason: Optional[str] = ""
    verifiedBy: Optional[str] = ""
    verifiedAt: Optional[str] = None
    mintEligibility: Optional[bool] = False
    mintEligibilityReasons: Optional[List] = None
    msmeWallet: Optional[str] = ""
    buyerWallet: Optional[str] = ""
    tokenId: Optional[int] = None
    blockchainTxHash: Optional[str] = None

    class Config:
        from_attributes = True
