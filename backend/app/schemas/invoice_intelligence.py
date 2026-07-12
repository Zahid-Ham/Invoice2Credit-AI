from pydantic import BaseModel, Field
from typing import List, Optional
from decimal import Decimal
from datetime import datetime

class ExtractedLineItem(BaseModel):
    description: Optional[str] = Field(None, description="Description of the item or service")
    quantity: Optional[Decimal] = Field(None, description="Quantity ordered/delivered")
    unit_price: Optional[Decimal] = Field(None, description="Price per unit of the item")
    tax_rate: Optional[Decimal] = Field(None, description="Applied tax rate as percentage (e.g. 18.0)")
    line_total: Optional[Decimal] = Field(None, description="Total amount for this line item")

class ExtractedInvoice(BaseModel):
    invoice_number: Optional[str] = Field(None, description="Invoice reference number")
    invoice_date: Optional[str] = Field(None, description="Invoice issue date (YYYY-MM-DD)")
    due_date: Optional[str] = Field(None, description="Invoice payment due date (YYYY-MM-DD)")
    seller_name: Optional[str] = Field(None, description="Seller company/legal name")
    seller_tax_id: Optional[str] = Field(None, description="Seller GSTIN or Tax ID")
    buyer_name: Optional[str] = Field(None, description="Buyer company/legal name")
    buyer_tax_id: Optional[str] = Field(None, description="Buyer GSTIN or Tax ID")
    currency: Optional[str] = Field("INR", description="Three-letter currency code (e.g. INR)")
    subtotal: Optional[Decimal] = Field(None, description="Invoice subtotal before tax")
    tax_amount: Optional[Decimal] = Field(None, description="Total tax amount")
    total_amount: Optional[Decimal] = Field(None, description="Grand total amount due")
    payment_terms: Optional[str] = Field(None, description="Payment terms description (e.g. Net 30)")
    purchase_order_reference: Optional[str] = Field(None, description="PO number reference")
    bank_account_reference_present: bool = Field(False, description="True if bank account/payment details are found in text")
    line_items: List[ExtractedLineItem] = Field(default_factory=list, description="Extracted individual line items")

class RiskSignal(BaseModel):
    code: str = Field(..., description="Unique machine-readable signal identifier")
    category: str = Field(..., description="Category group (e.g. INTEGRITY, DATE_ANOMALY, RECONCILIATION)")
    severity: str = Field(..., description="INFO, LOW, MEDIUM, HIGH, CRITICAL")
    title: str = Field(..., description="Human-readable title")
    description: str = Field(..., description="Detailed explanation of the risk signal")
    evidence: Optional[str] = Field(None, description="Extracted evidence supporting the signal trigger")
    source: str = Field(..., description="Source of the signal (DETERMINISTIC, AI, BLOCKCHAIN, SYSTEM)")

class AIAnalysisResponseSchema(BaseModel):
    risk_score: int = Field(..., ge=0, le=100, description="AI calculated risk score between 0 and 100")
    risk_level: str = Field(..., description="LOW, MEDIUM, HIGH, CRITICAL")
    summary: str = Field(..., description="Executive summary of risks")
    signals: List[RiskSignal] = Field(default_factory=list, description="Extracted risk signals from AI")
    positive_indicators: List[str] = Field(default_factory=list, description="Extracted positive flags from AI")
    recommended_verifier_checks: List[str] = Field(default_factory=list, description="Recommended checklist for manual verification")
    analysis_limitations: List[str] = Field(default_factory=list, description="Identified limitations of current analysis")

class VerifierDecisionRequest(BaseModel):
    decision: str = Field(..., description="APPROVED, REJECTED, REQUEST_REVIEW")
    reason: str = Field("", description="Justification note for the decision")
