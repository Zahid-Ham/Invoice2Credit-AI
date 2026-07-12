import logging
from typing import List, Dict, Any

logger = logging.getLogger("RiskService")

# Define deterministic weights
DETERMINISTIC_WEIGHTS = {
    "EXACT_FILE_DUPLICATE": 100,
    "BUSINESS_INVOICE_DUPLICATE": 50,
    "SELLER_BUYER_IDENTITY_MATCH": 50,
    "INVALID_DATE_ORDER": 40,
    "INVALID_TOTAL_AMOUNT": 30,
    "FUTURE_INVOICE_DATE": 25,
    "AMOUNT_RECONCILIATION_MISMATCH": 20,
    "INVALID_SELLER_GSTIN_FORMAT": 15,
    "INVALID_BUYER_GSTIN_FORMAT": 15,
    "MISSING_INVOICE_NUMBER": 15,
    "MISSING_SELLER_NAME": 15,
    "MISSING_BUYER_NAME": 15,
    "STALE_INVOICE": 10,
    "LINE_ITEM_RECONCILIATION_MISMATCH": 10,
    "MISSING_PURCHASE_ORDER": 5,
}

def resolve_risk_level(score: int) -> str:
    """
    Centrally defined boundaries:
    0-24 LOW
    25-49 MEDIUM
    50-74 HIGH
    75-100 CRITICAL
    """
    if score <= 24:
        return "LOW"
    elif score <= 49:
        return "MEDIUM"
    elif score <= 74:
        return "HIGH"
    return "CRITICAL"

def aggregate_invoice_risk(
    deterministic_signals: List[Dict[str, Any]],
    ai_score: int
) -> Dict[str, Any]:
    """
    Aggregates risk score based on:
    - Sum of deterministic signal weights.
    - AI risk score from Groq.
    - Overrides for exact cryptographic duplicates.
    Formula:
      deterministic_score = sum(DETERMINISTIC_WEIGHTS[signal]) (max 100)
      base_score = int(0.5 * deterministic_score + 0.5 * ai_score)
      final_score = min(100, base_score)
      
    Overrides:
      - EXACT_FILE_DUPLICATE forces final_score = 100.
      - BUSINESS_INVOICE_DUPLICATE forces final_score = max(final_score, 75).
      - INVALID_DATE_ORDER forces final_score = max(final_score, 75).
      - SELLER_BUYER_IDENTITY_MATCH forces final_score = max(final_score, 75).
    """
    det_sum = 0
    has_exact_dup = False
    has_bus_dup = False
    has_date_err = False
    has_identity_match = False
    
    for sig in deterministic_signals:
        code = sig.get("code")
        weight = DETERMINISTIC_WEIGHTS.get(code, 0)
        det_sum += weight
        
        if code == "EXACT_FILE_DUPLICATE":
            has_exact_dup = True
        elif code == "BUSINESS_INVOICE_DUPLICATE":
            has_bus_dup = True
        elif code == "INVALID_DATE_ORDER":
            has_date_err = True
        elif code == "SELLER_BUYER_IDENTITY_MATCH":
            has_identity_match = True

    deterministic_score = min(100, det_sum)
    base_score = int(0.5 * deterministic_score + 0.5 * ai_score)
    final_score = min(100, base_score)
    
    explanation = "Risk calculated as 50% deterministic validation contribution + 50% AI risk contribution."

    # Apply overrides
    if has_exact_dup:
        final_score = 100
        explanation = "Critical Override: Exact cryptographic duplicate detected. Score set to 100 (CRITICAL)."
    elif has_bus_dup or has_identity_match:
        final_score = max(final_score, 75)
        explanation = "High Risk Override: Structural or business duplicate detected. Score enforced to at least 75 (CRITICAL)."
    elif has_date_err:
        final_score = max(final_score, 75)
        explanation = "High Risk Override: Invalid date order detected. Score enforced to at least 75 (CRITICAL)."

    return {
        "deterministic_score": deterministic_score,
        "ai_score": ai_score,
        "final_score": final_score,
        "final_risk_level": resolve_risk_level(final_score),
        "explanation": explanation
    }
