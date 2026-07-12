import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any

from app.invoice.repositories.invoice_repository import invoice_repository
from app.invoice.utils.invoice_utils import InvoiceUtils
from app.services.cloudinary_service import CloudinaryService

class InvoiceService:
    def __init__(self):
        pass

    def process_invoice_upload(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: str,
        invoice_number: str,
        invoice_date: str,
        due_date: str,
        invoice_amount: float,
        currency: str,
        seller_name: str,
        seller_gst: str,
        buyer_name: str,
        buyer_gst: str,
        buyer_company: str,
        industry: str,
        created_by: str,
        msme_wallet: str = "",
        buyer_wallet: str = ""
    ) -> Dict[str, Any]:
        """
        Implements the complete upload and analysis pipeline:
        1. Validate file format and size limits.
        2. Calculate cryptographic SHA-256 fingerprint.
        3. Check duplicates.
        4. Upload raw file to Cloudinary.
        5. Persist base record.
        6. Execute intelligence analyzer (OCR + Rules + Groq AI).
        """
        from app.services.invoice_intelligence.file_validator import validate_invoice_file
        from app.services.invoice_intelligence.intelligence_service import process_invoice_intelligence

        # 1. Validate file signature and MIME type
        ok, type_or_err = validate_invoice_file(file_bytes, filename, content_type)
        if not ok:
            raise ValueError(f"File validation error: {type_or_err}")

        # 2. Calculate canonical hash
        invoice_hash = InvoiceUtils.calculate_sha256(file_bytes)

        # 3. Check duplicate by Hash
        hash_dup = invoice_repository.get_by_hash(invoice_hash)
        if hash_dup:
            raise ValueError(f"Duplicate Invoice: Document with matching content hash already exists. ID: {hash_dup['invoiceId']}")

        # 4. Check duplicate by InvoiceNumber + SellerGST
        number_dup = invoice_repository.check_duplicate_by_number_and_seller(invoice_number, seller_gst)
        if number_dup:
            raise ValueError(f"Duplicate Invoice: Invoice number {invoice_number} already registered for seller {seller_gst}.")

        # 5. Upload file to Cloudinary
        invoice_pdf_url = CloudinaryService.upload_file(file_bytes, filename)
        if not invoice_pdf_url:
            raise RuntimeError("Failed to upload invoice document to Cloudinary storage.")

        # 6. Create initial structured metadata record
        invoice_id = str(uuid.uuid4())
        now_iso = datetime.utcnow().isoformat() + "Z"

        invoice_data = {
            "invoiceId": invoice_id,
            "invoiceNumber": invoice_number,
            "invoiceDate": invoice_date,
            "dueDate": due_date,
            "invoiceAmount": invoice_amount,
            "currency": currency.upper(),
            "sellerName": seller_name,
            "sellerGST": seller_gst.upper(),
            "buyerName": buyer_name,
            "buyerGST": buyer_gst.upper(),
            "buyerCompany": buyer_company or buyer_name,
            "invoiceStatus": "PENDING",
            "industry": industry.upper(),
            "invoicePDFUrl": invoice_pdf_url,
            "invoiceHash": invoice_hash,
            "riskScore": 0.0,
            "verificationStatus": "PENDING",
            "duplicateStatus": "CLEAN",
            "marketplaceStatus": "UNLISTED",
            "blockchainStatus": "UNMINTED",
            "createdBy": created_by,
            "msmeWallet": msme_wallet,
            "buyerWallet": buyer_wallet,
            "createdAt": now_iso,
            "updatedAt": now_iso
        }

        # Save initial document to database
        invoice_repository.save(invoice_data)

        # 7. Execute AI intelligence analysis pipeline
        return process_invoice_intelligence(invoice_id, file_bytes, filename, type_or_err)

    def get_invoice(self, invoice_id: str) -> Optional[Dict[str, Any]]:
        return invoice_repository.get_by_id(invoice_id)

    def list_invoices(self, creator_id: Optional[str] = None, status: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        return invoice_repository.list_all(creator_id=creator_id, status=status, limit=limit)

    def update_invoice(self, invoice_id: str, update_fields: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        update_fields["updatedAt"] = datetime.utcnow().isoformat() + "Z"
        return invoice_repository.update(invoice_id, update_fields)

    def delete_invoice(self, invoice_id: str) -> bool:
        return invoice_repository.delete(invoice_id)

invoice_service = InvoiceService()
