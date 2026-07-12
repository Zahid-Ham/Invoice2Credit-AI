import logging
from typing import List, Dict, Any
from google.cloud.firestore_v1.base_query import FieldFilter
from app.invoice.repositories.invoice_repository import invoice_repository

logger = logging.getLogger("DuplicateSignalService")

def check_invoice_duplicates(
    invoice_id: str,
    invoice_hash: str,
    seller_gst: str,
    invoice_number: str,
    chain_id: int
) -> List[Dict[str, Any]]:
    """
    Analyzes duplicate signals:
    - Level 1: Cryptographic duplicate (exact same SHA-256 hash in Firestore)
    - Level 2: Business duplicate (same seller_gst and invoice_number)
    """
    signals = []
    
    # 1. Level 1 - Cryptographic check
    # Check if this hash is already in Firestore under a DIFFERENT document ID
    db = invoice_repository.db
    hash_query = db.collection("invoices").where(filter=FieldFilter("invoiceHash", "==", invoice_hash)).get()
    
    for doc in hash_query:
        doc_data = doc.to_dict()
        if doc_data.get("invoiceId") != invoice_id:
            signals.append({
                "code": "EXACT_FILE_DUPLICATE",
                "category": "INTEGRITY",
                "severity": "CRITICAL",
                "title": "Exact Cryptographic Duplicate",
                "description": f"An invoice file with the exact same SHA-256 fingerprint already exists in the registry. Matching Invoice ID: {doc_data.get('invoiceId')}.",
                "evidence": f"Hash: {invoice_hash}",
                "source": "DETERMINISTIC"
            })
            break # One exact duplicate is enough to trigger the signal

    # 2. Level 2 - Business duplicate check
    if seller_gst and invoice_number:
        norm_gst = seller_gst.strip().upper()
        norm_num = invoice_number.strip()
        
        bus_query = db.collection("invoices")\
            .where(filter=FieldFilter("sellerGST", "==", norm_gst))\
            .where(filter=FieldFilter("invoiceNumber", "==", norm_num))\
            .get()
            
        for doc in bus_query:
            doc_data = doc.to_dict()
            if doc_data.get("invoiceId") != invoice_id:
                signals.append({
                    "code": "BUSINESS_INVOICE_DUPLICATE",
                    "category": "INTEGRITY",
                    "severity": "HIGH",
                    "title": "Potential Business Duplicate",
                    "description": f"An invoice with the same Invoice Number ({norm_num}) and Seller GSTIN ({norm_gst}) already exists.",
                    "evidence": f"Duplicate document registered: {doc_data.get('invoiceId')}",
                    "source": "DETERMINISTIC"
                })
                break
                
    return signals
