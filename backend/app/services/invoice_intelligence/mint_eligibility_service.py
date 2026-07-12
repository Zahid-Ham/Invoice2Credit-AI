import re
import logging
from datetime import datetime
from typing import Dict, Any, List

logger = logging.getLogger("MintEligibilityService")

ETH_ADDRESS_REGEX = re.compile(r"^0x[a-fA-F0-9]{40}$")
HASH_REGEX = re.compile(r"^0x[a-f0-9]{64}$")

def check_mint_eligibility(invoice: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates backend mint eligibility rules for the invoice.
    Returns:
    - eligible (bool)
    - reasons (List[str])
    - evaluatedAt (str)
    """
    reasons = []
    
    # 1. Extraction status check
    ext_status = invoice.get("extractionStatus", "PENDING")
    if ext_status != "COMPLETED":
        reasons.append(f"Invoice text extraction is not complete (current: {ext_status}).")

    # 2. Deterministic validation check
    val_status = invoice.get("validationStatus", "PENDING")
    if val_status != "COMPLETED":
        reasons.append(f"Deterministic validation checks have not completed (current: {val_status}).")

    # 3. AI Analysis status check
    ai_status = invoice.get("aiAnalysisStatus", "PENDING")
    if ai_status != "COMPLETED":
        reasons.append(f"AI Risk analysis is not complete (current: {ai_status}).")

    # 4. Verifier approval check
    decision = invoice.get("verifierDecision", "PENDING")
    if decision != "APPROVED":
        reasons.append(f"Invoice must be APPROVED by a platform verifier (current decision: {decision}).")

    # 5. Blockchain status check
    bc_status = invoice.get("blockchainStatus", "UNMINTED")
    if bc_status != "UNMINTED":
        reasons.append(f"Invoice already minted on-chain (blockchainStatus: {bc_status}).")

    # 6. Cryptographic fingerprint verification
    invoice_hash = invoice.get("invoiceHash", "")
    if not invoice_hash or not HASH_REGEX.match(invoice_hash):
        reasons.append(f"Invoice hash format is invalid (got: {invoice_hash}). Must be 0x + 64 lower-case hex characters.")

    # 7. Wallet formats and presence
    msme_wallet = invoice.get("msmeWallet", "")
    buyer_wallet = invoice.get("buyerWallet", "")
    
    if not msme_wallet:
        reasons.append("MSME payout recipient wallet address is missing.")
    elif not ETH_ADDRESS_REGEX.match(msme_wallet):
        reasons.append(f"MSME wallet address format is invalid: {msme_wallet}.")

    if not buyer_wallet:
        reasons.append("Buyer corporate wallet address is missing.")
    elif not ETH_ADDRESS_REGEX.match(buyer_wallet):
        reasons.append(f"Buyer wallet address format is invalid: {buyer_wallet}.")

    # 8. Counterparty address collision
    if msme_wallet and buyer_wallet and msme_wallet.lower() == buyer_wallet.lower():
        reasons.append("MSME wallet address and Buyer wallet address must not be identical.")

    # 9. Exact duplicate override check
    dup_status = invoice.get("duplicateStatus", "CLEAN")
    if dup_status == "DUPLICATE" or any(sig.get("code") == "EXACT_FILE_DUPLICATE" for sig in invoice.get("riskSignals", [])):
        reasons.append("Invoice is marked as a cryptographic file duplicate of another record.")

    eligible = len(reasons) == 0
    return {
        "eligible": eligible,
        "reasons": reasons,
        "evaluatedAt": datetime.utcnow().isoformat() + "Z"
    }
