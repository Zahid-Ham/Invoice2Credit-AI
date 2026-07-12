import os
import logging
from datetime import datetime
from typing import Dict, Any, Tuple

from app.invoice.repositories.invoice_repository import invoice_repository
from app.services.invoice_hash_service import calculate_invoice_sha256
from app.services.invoice_intelligence.file_validator import validate_invoice_file
from app.services.invoice_intelligence.pdf_extractor import extract_pdf_text
from app.services.invoice_intelligence.image_ocr_service import perform_ocr
from app.services.invoice_intelligence.duplicate_signal_service import check_invoice_duplicates
from app.services.invoice_intelligence.deterministic_validator import validate_extracted_invoice
from app.services.invoice_intelligence.groq_risk_service import groq_risk_service
from app.services.invoice_intelligence.risk_service import aggregate_invoice_risk
from app.services.invoice_intelligence.mint_eligibility_service import check_mint_eligibility
from app.schemas.invoice_intelligence import ExtractedInvoice, AIAnalysisResponseSchema

logger = logging.getLogger("InvoiceIntelligenceService")

ANALYSIS_VERSION = "invoice-risk-v1"

def process_invoice_intelligence(
    invoice_id: str,
    file_bytes: bytes,
    filename: str,
    content_type: str
) -> Dict[str, Any]:
    """
    Executes the full AI Invoice Intelligence lifecycle:
    1. File Validation
    2. Cryptographic Fingerprint
    3. Text/OCR Extraction
    4. Deterministic Validations
    5. Duplicate Signal Check
    6. AI Risk Analysis (Groq)
    7. Final Risk Aggregation
    8. Database Persistence
    9. Mint Eligibility Assessment
    """
    logger.info(f"Starting invoice intelligence analysis for ID: {invoice_id}")
    
    # Fetch existing metadata from database
    invoice = invoice_repository.get_by_id(invoice_id)
    if not invoice:
        raise ValueError(f"Invoice {invoice_id} not found in database.")

    # 1. File Validation
    ok, type_or_err = validate_invoice_file(file_bytes, filename, content_type)
    if not ok:
        raise ValueError(f"File validation failed: {type_or_err}")
        
    mime_type = type_or_err

    # 2. Cryptographic Hash (Must be done on raw bytes BEFORE storage/Cloudinary)
    hash_res = calculate_invoice_sha256(file_bytes)
    invoice_hash = hash_res["hex"]

    # 3. Extraction
    raw_text = ""
    extractor_used = "none"
    page_count = 1
    warnings = ""
    extraction_status = "PENDING"
    
    try:
        if mime_type == "application/pdf":
            raw_text, page_count, is_scanned = extract_pdf_text(file_bytes, filename)
            extractor_used = "pdf_parser"
            if is_scanned:
                # Fallback to OCR for scanned PDFs
                ocr_text, confidence, ocr_warning = perform_ocr(file_bytes, filename)
                raw_text = ocr_text
                extractor_used = "ocr"
                warnings = ocr_warning
        else:
            # PNG / JPEG images
            ocr_text, confidence, ocr_warning = perform_ocr(file_bytes, filename)
            raw_text = ocr_text
            extractor_used = "ocr"
            warnings = ocr_warning
            
        extraction_status = "COMPLETED"
    except Exception as e:
        logger.error(f"Extraction failed: {e}")
        extraction_status = "FAILED"
        warnings = f"Extraction error: {e}"

    # 4. Duplicate Check (Level 1 & Level 2)
    # We pass current input fields if extracted fields are not ready yet
    seller_gst = invoice.get("sellerGST", "")
    invoice_num = invoice.get("invoiceNumber", "")
    
    dup_signals = check_invoice_duplicates(
        invoice_id=invoice_id,
        invoice_hash=invoice_hash,
        seller_gst=seller_gst,
        invoice_number=invoice_num,
        chain_id=invoice.get("chainId", 31337)
    )
    
    has_crypt_dup = any(s["code"] == "EXACT_FILE_DUPLICATE" for s in dup_signals)
    duplicate_status = "DUPLICATE" if has_crypt_dup else "SUSPICIOUS" if len(dup_signals) > 0 else "CLEAN"

    # 5. Deterministic Rules Validator
    # Map the current form fields to Pydantic model for base validation
    extracted_model = ExtractedInvoice(
        invoice_number=invoice_num,
        invoice_date=invoice.get("invoiceDate", ""),
        due_date=invoice.get("dueDate", ""),
        seller_name=invoice.get("sellerName", ""),
        seller_tax_id=seller_gst,
        buyer_name=invoice.get("buyerName", ""),
        buyer_tax_id=invoice.get("buyerGST", ""),
        currency=invoice.get("currency", "INR"),
        subtotal=invoice.get("subtotal") or invoice.get("invoiceAmount"),
        tax_amount=invoice.get("taxAmount") or 0,
        total_amount=invoice.get("invoiceAmount", 0),
        purchase_order_reference=invoice.get("purchaseOrderReference", None),
        bank_account_reference_present=False
    )
    
    det_signals = validate_extracted_invoice(extracted_model)
    validation_status = "COMPLETED"

    # 6. Groq AI Risk Analysis
    ai_analysis_status = "PENDING"
    ai_score = 0
    ai_risk_level = "LOW"
    ai_signals = []
    ai_report_json = {}
    
    if raw_text and os.getenv("GROQ_API_KEY"):
        try:
            # We call Groq to normalize fields and analyze risk
            extracted_ai, risk_ai = groq_risk_service.analyze_invoice_with_ai(raw_text, det_signals)
            
            # Use normalized extracted fields if confidently found by Groq
            if extracted_ai.invoice_number:
                extracted_model = extracted_ai
                
            ai_score = risk_ai.risk_score
            ai_risk_level = risk_ai.risk_level
            
            # Map AI signals
            for s in risk_ai.signals:
                ai_signals.append(s.dict())
                
            ai_report_json = risk_ai.dict()
            ai_analysis_status = "COMPLETED"
        except Exception as e:
            logger.error(f"Groq AI analysis failed: {e}")
            ai_analysis_status = "FAILED"
            warnings = f"{warnings}; AI Analysis failed: {e}".strip("; ")
    else:
        logger.warning("Groq API key missing or raw text empty. Skipping AI analysis.")
        ai_analysis_status = "FAILED"
        warnings = f"{warnings}; Groq API key missing or extraction empty.".strip("; ")

    # 7. Final Risk Aggregation
    combined_signals = det_signals + ai_signals + dup_signals
    risk_summary = aggregate_invoice_risk(combined_signals, ai_score)

    # 8. Document Metadata Extension
    now_iso = datetime.utcnow().isoformat() + "Z"
    
    update_data = {
        "invoiceHash": invoice_hash,
        "extractionStatus": extraction_status,
        "extractedInvoice": extracted_model.dict(),
        "validationStatus": validation_status,
        "validationSignals": det_signals,
        "duplicateSignals": dup_signals,
        "aiAnalysisStatus": ai_analysis_status,
        "aiRiskAnalysis": ai_report_json,
        "riskScore": risk_summary["final_score"],
        "riskLevel": risk_summary["final_risk_level"],
        "riskSignals": combined_signals,
        "duplicateStatus": duplicate_status,
        "analysisVersion": ANALYSIS_VERSION,
        "analyzedAt": now_iso,
        "updatedAt": now_iso,
        "riskExplanation": risk_summary["explanation"]
    }
    
    # Initialize verifier Decision placeholder if not present
    if "verifierDecision" not in invoice:
        update_data["verifierDecision"] = "PENDING"
        update_data["verifierDecisionReason"] = ""
        update_data["verifiedBy"] = ""
        update_data["verifiedAt"] = None

    # Merge database updates
    invoice.update(update_data)
    
    # 9. Evaluate Mint Eligibility
    elig_result = check_mint_eligibility(invoice)
    invoice["mintEligibility"] = elig_result["eligible"]
    invoice["mintEligibilityReasons"] = elig_result["reasons"]
    
    # Persist back to database
    invoice_repository.update(invoice_id, invoice)
    
    logger.info(f"Invoice intelligence processing completed successfully for: {invoice_id}")
    return invoice
