import re
import logging
from decimal import Decimal
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from app.schemas.invoice_intelligence import ExtractedInvoice

logger = logging.getLogger("DeterministicValidator")

GST_REGEX = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")
SUPPORTED_CURRENCIES = {"INR", "USD", "EUR", "GBP", "JPY", "AED", "SGD", "AUD", "CAD"}
RECONCILIATION_TOLERANCE = Decimal("0.10") # 10 paisa/cents tolerance

def validate_extracted_invoice(invoice: ExtractedInvoice) -> List[Dict[str, Any]]:
    """
    Executes core deterministic checks on the extracted fields.
    Returns a list of RiskSignal dicts.
    """
    signals = []

    # 1. Basic Presence Checks
    if not invoice.invoice_number:
        signals.append({
            "code": "MISSING_INVOICE_NUMBER",
            "category": "INTEGRITY",
            "severity": "HIGH",
            "title": "Missing Invoice Number",
            "description": "The invoice number field could not be extracted.",
            "source": "DETERMINISTIC"
        })

    if not invoice.seller_name:
        signals.append({
            "code": "MISSING_SELLER_NAME",
            "category": "INTEGRITY",
            "severity": "HIGH",
            "title": "Missing Seller Identity",
            "description": "The seller corporate legal name is missing.",
            "source": "DETERMINISTIC"
        })

    if not invoice.buyer_name:
        signals.append({
            "code": "MISSING_BUYER_NAME",
            "category": "INTEGRITY",
            "severity": "HIGH",
            "title": "Missing Buyer Identity",
            "description": "The buyer corporate legal name is missing.",
            "source": "DETERMINISTIC"
        })

    # 2. Date validations
    inv_date: Optional[date] = None
    due_date: Optional[date] = None
    
    if invoice.invoice_date:
        try:
            inv_date = datetime.strptime(invoice.invoice_date, "%Y-%m-%d").date()
            # Check future date
            if inv_date > datetime.utcnow().date():
                signals.append({
                    "code": "FUTURE_INVOICE_DATE",
                    "category": "DATE_ANOMALY",
                    "severity": "HIGH",
                    "title": "Future Invoice Date",
                    "description": f"The invoice date ({invoice.invoice_date}) is in the future.",
                    "evidence": invoice.invoice_date,
                    "source": "DETERMINISTIC"
                })
            # Check extremely old invoice (older than 180 days)
            days_old = (datetime.utcnow().date() - inv_date).days
            if days_old > 180:
                signals.append({
                    "code": "STALE_INVOICE",
                    "category": "DATE_ANOMALY",
                    "severity": "MEDIUM",
                    "title": "Stale Invoice Anomaly",
                    "description": f"The invoice is {days_old} days old (exceeds 180 days limit).",
                    "evidence": f"Days old: {days_old}",
                    "source": "DETERMINISTIC"
                })
        except ValueError:
            signals.append({
                "code": "INVALID_INVOICE_DATE_FORMAT",
                "category": "DATE_ANOMALY",
                "severity": "MEDIUM",
                "title": "Invalid Invoice Date Format",
                "description": f"The invoice date ({invoice.invoice_date}) is not in YYYY-MM-DD format.",
                "source": "DETERMINISTIC"
            })

    if invoice.due_date:
        try:
            due_date = datetime.strptime(invoice.due_date, "%Y-%m-%d").date()
        except ValueError:
            signals.append({
                "code": "INVALID_DUE_DATE_FORMAT",
                "category": "DATE_ANOMALY",
                "severity": "MEDIUM",
                "title": "Invalid Due Date Format",
                "description": f"The due date ({invoice.due_date}) is not in YYYY-MM-DD format.",
                "source": "DETERMINISTIC"
            })

    if inv_date and due_date:
        if due_date < inv_date:
            signals.append({
                "code": "INVALID_DATE_ORDER",
                "category": "DATE_ANOMALY",
                "severity": "CRITICAL",
                "title": "Invalid Date Ordering",
                "description": f"The payment due date ({invoice.due_date}) is earlier than the invoice issue date ({invoice.invoice_date}).",
                "evidence": f"Due: {invoice.due_date} < Invoice: {invoice.invoice_date}",
                "source": "DETERMINISTIC"
            })
            
        due_days = (due_date - inv_date).days
        if due_days > 365:
            signals.append({
                "code": "DUE_DATE_ANOMALY",
                "category": "DATE_ANOMALY",
                "severity": "LOW",
                "title": "Excessive Due Date Period",
                "description": f"The invoice specifies a due date {due_days} days in the future, which is unusually long.",
                "evidence": f"Days to payment: {due_days}",
                "source": "DETERMINISTIC"
            })

    # 3. Currency Validation
    if invoice.currency and invoice.currency.upper() not in SUPPORTED_CURRENCIES:
        signals.append({
            "code": "UNSUPPORTED_CURRENCY",
            "category": "INTEGRITY",
            "severity": "MEDIUM",
            "title": "Unsupported Currency",
            "description": f"Currency code '{invoice.currency}' is not on the platform's supported currencies list.",
            "evidence": invoice.currency,
            "source": "DETERMINISTIC"
        })

    # 4. Identity Match
    if invoice.seller_name and invoice.buyer_name:
        if invoice.seller_name.strip().lower() == invoice.buyer_name.strip().lower():
            signals.append({
                "code": "SELLER_BUYER_IDENTITY_MATCH",
                "category": "INTEGRITY",
                "severity": "CRITICAL",
                "title": "Counterparty Match Warning",
                "description": "The seller name and buyer name are identical, suggesting a self-dealing or circular financing attempt.",
                "evidence": f"Name: {invoice.seller_name}",
                "source": "DETERMINISTIC"
            })

    # 5. Financial calculations (Decimal)
    total = Decimal(str(invoice.total_amount)) if invoice.total_amount is not None else Decimal("0")
    subtotal = Decimal(str(invoice.subtotal)) if invoice.subtotal is not None else None
    tax_amount = Decimal(str(invoice.tax_amount)) if invoice.tax_amount is not None else None

    if total <= Decimal("0"):
        signals.append({
            "code": "INVALID_TOTAL_AMOUNT",
            "category": "RECONCILIATION",
            "severity": "CRITICAL",
            "title": "Invalid Total Amount",
            "description": f"The grand total amount ({total}) must be positive and greater than zero.",
            "source": "DETERMINISTIC"
        })

    if subtotal is not None and subtotal < Decimal("0"):
        signals.append({
            "code": "INVALID_SUBTOTAL_AMOUNT",
            "category": "RECONCILIATION",
            "severity": "HIGH",
            "title": "Negative Subtotal",
            "description": f"The subtotal amount ({subtotal}) cannot be negative.",
            "source": "DETERMINISTIC"
        })

    if tax_amount is not None and tax_amount < Decimal("0"):
        signals.append({
            "code": "INVALID_TAX_AMOUNT",
            "category": "RECONCILIATION",
            "severity": "HIGH",
            "title": "Negative Tax Amount",
            "description": f"The tax amount ({tax_amount}) cannot be negative.",
            "source": "DETERMINISTIC"
        })

    # Reconcile Subtotal + Tax = Total
    if subtotal is not None and tax_amount is not None and total > Decimal("0"):
        summed_total = subtotal + tax_amount
        diff = abs(total - summed_total)
        if diff > RECONCILIATION_TOLERANCE:
            signals.append({
                "code": "AMOUNT_RECONCILIATION_MISMATCH",
                "category": "RECONCILIATION",
                "severity": "HIGH",
                "title": "Grand Total Reconciliation Mismatch",
                "description": f"Grand total ({total}) does not equal subtotal + tax ({summed_total}).",
                "evidence": f"Diff: {diff} (Subtotal: {subtotal}, Tax: {tax_amount})",
                "source": "DETERMINISTIC"
            })

    # Reconcile Line items
    if invoice.line_items:
        items_total = Decimal("0")
        line_item_math_correct = True
        
        for idx, item in enumerate(invoice.line_items):
            qty = item.quantity if item.quantity is not None else Decimal("1")
            price = item.unit_price if item.unit_price is not None else Decimal("0")
            item_expected_total = qty * price
            
            if item.line_total is not None:
                items_total += item.line_total
                line_diff = abs(item.line_total - item_expected_total)
                if line_diff > RECONCILIATION_TOLERANCE:
                    signals.append({
                        "code": "LINE_ITEM_RECONCILIATION_MISMATCH",
                        "category": "RECONCILIATION",
                        "severity": "MEDIUM",
                        "title": f"Line Item {idx + 1} Math Mismatch",
                        "description": f"Line item total ({item.line_total}) does not reconcile with Quantity ({qty}) * Unit Price ({price}).",
                        "evidence": f"Expected: {item_expected_total}, Got: {item.line_total}",
                        "source": "DETERMINISTIC"
                    })
                    line_item_math_correct = False
            else:
                items_total += item_expected_total
                
        # Compare items sum against subtotal (or total if subtotal is missing)
        check_target = subtotal if subtotal is not None else total
        if check_target > Decimal("0") and abs(items_total - check_target) > RECONCILIATION_TOLERANCE:
            signals.append({
                "code": "ITEMS_SUBTOTAL_MISMATCH",
                "category": "RECONCILIATION",
                "severity": "MEDIUM",
                "title": "Line Items Sum Mismatch",
                "description": f"The sum of line items ({items_total}) does not reconcile with the invoice subtotal/total ({check_target}).",
                "evidence": f"Diff: {abs(items_total - check_target)}",
                "source": "DETERMINISTIC"
            })

    # 6. GSTIN Validity
    if invoice.seller_tax_id:
        seller_tax_clean = invoice.seller_tax_id.strip().upper()
        if not GST_REGEX.match(seller_tax_clean):
            signals.append({
                "code": "INVALID_SELLER_GSTIN_FORMAT",
                "category": "INTEGRITY",
                "severity": "MEDIUM",
                "title": "Invalid Seller GSTIN Format",
                "description": f"The seller GSTIN ({invoice.seller_tax_id}) does not match the standard 15-character Indian format.",
                "evidence": invoice.seller_tax_id,
                "source": "DETERMINISTIC"
            })

    if invoice.buyer_tax_id:
        buyer_tax_clean = invoice.buyer_tax_id.strip().upper()
        if not GST_REGEX.match(buyer_tax_clean):
            signals.append({
                "code": "INVALID_BUYER_GSTIN_FORMAT",
                "category": "INTEGRITY",
                "severity": "MEDIUM",
                "title": "Invalid Buyer GSTIN Format",
                "description": f"The buyer GSTIN ({invoice.buyer_tax_id}) does not match the standard 15-character Indian format.",
                "evidence": invoice.buyer_tax_id,
                "source": "DETERMINISTIC"
            })

    # 7. Purchase Order Reference presence
    if not invoice.purchase_order_reference:
        signals.append({
            "code": "MISSING_PURCHASE_ORDER",
            "category": "INTEGRITY",
            "severity": "LOW",
            "title": "Missing Purchase Order Reference",
            "description": "No purchase order (PO) reference number was found.",
            "source": "DETERMINISTIC"
        })

    return signals
