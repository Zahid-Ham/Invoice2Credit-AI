import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, status, Query, Body

from app.invoice.services.invoice_service import invoice_service
from app.invoice.services.extraction_service import extraction_service
from app.invoice.schemas.invoice import InvoiceResponse, InvoiceUpdate
from app.invoice.utils.invoice_utils import InvoiceUtils

logger = logging.getLogger("InvoiceRoutes")

router = APIRouter(prefix="/v1/invoices", tags=["Invoices"])


@router.post("/extract", status_code=status.HTTP_200_OK)
async def extract_invoice_fields(
    file: UploadFile = File(..., description="PDF invoice to extract fields from"),
):
    """
    Stage-1 of the upload pipeline: extract invoice fields from a PDF without
    persisting anything to the database.  Returns extracted fields with per-field
    confidence scores so the UI can highlight uncertain values.

    This endpoint is fully OCR-agnostic — swap extraction_service.use_extractor()
    in extraction_service.py to upgrade from regex parsing to any OCR backend
    without touching this route.
    """
    filename = file.filename or "invoice.pdf"
    if not (filename.lower().endswith(".pdf") or file.content_type == "application/pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF documents are accepted for extraction.",
        )

    file_bytes = await file.read()
    if len(file_bytes) > 20 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds 20 MB maximum.",
        )

    try:
        result = extraction_service.extract_from_bytes(file_bytes, filename)
        return result.to_dict()
    except Exception as exc:
        logger.exception("Extraction endpoint error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Extraction failed: {exc}",
        )

@router.post("/upload", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def upload_invoice(
    file: UploadFile = File(..., description="Raw PDF invoice document"),
    invoiceNumber: str = Form(..., description="Invoice unique number"),
    invoiceDate: str = Form(..., description="Invoice date in YYYY-MM-DD format"),
    dueDate: str = Form(..., description="Payment due date in YYYY-MM-DD format"),
    invoiceAmount: float = Form(..., description="Total invoice amount"),
    currency: str = Form("INR", description="Three-letter currency code"),
    sellerName: str = Form(..., description="Seller corporate legal name"),
    sellerGST: str = Form(..., description="Seller 15-character GSTIN"),
    buyerName: str = Form(..., description="Buyer corporate legal name"),
    buyerGST: str = Form(..., description="Buyer 15-character GSTIN"),
    buyerCompany: str = Form(..., description="Buyer company name"),
    industry: str = Form("RETAIL", description="Sector classification (e.g. TEXTILES, RETAIL)"),
    createdBy: str = Form(..., description="UID of the user creating the invoice")
):
    """
    Exposes invoice upload pipeline.
    Accepts invoice PDF file (max 20MB) and core metadata.
    Validates PDF format, dates, amount, and GSTIN formats, uploads PDF, and stores in database.
    """
    # 1. Validate file extension/mime type is PDF
    filename = file.filename or "invoice.pdf"
    if not (filename.lower().endswith(".pdf") or file.content_type == "application/pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only PDF documents are accepted."
        )

    # 2. Validate maximum file size (20 MB)
    # Read file into memory (FastAPI uses SpooledTemporaryFile)
    file_bytes = await file.read()
    max_size_bytes = 20 * 1024 * 1024 # 20MB
    if len(file_bytes) > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds maximum limit of 20 Megabytes (MB)."
        )

    # 3. Validate Invoice Amount
    if not InvoiceUtils.validate_amount(invoiceAmount):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice amount must be positive and greater than zero."
        )

    # 4. Validate GST Formats
    if not InvoiceUtils.validate_gst(sellerGST):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Seller GSTIN format: '{sellerGST}'. Must be a valid 15-character Indian GSTIN."
        )
    if not InvoiceUtils.validate_gst(buyerGST):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Buyer GSTIN format: '{buyerGST}'. Must be a valid 15-character Indian GSTIN."
        )

    # 5. Validate Dates
    if not InvoiceUtils.validate_dates(invoiceDate, dueDate):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Due date must be on or after the invoice date. Formats must be YYYY-MM-DD."
        )

    try:
        # Call Service Layer
        invoice = invoice_service.process_invoice_upload(
            file_bytes=file_bytes,
            filename=filename,
            invoice_number=invoiceNumber,
            invoice_date=invoiceDate,
            due_date=dueDate,
            invoice_amount=invoiceAmount,
            currency=currency,
            seller_name=sellerName,
            seller_gst=sellerGST,
            buyer_name=buyerName,
            buyer_gst=buyerGST,
            buyer_company=buyerCompany,
            industry=industry,
            created_by=createdBy
        )
        return invoice
    except ValueError as ve:
        # Business validation duplicate error
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(ve)
        )
    except Exception as e:
        logger.error(f"Error processing invoice upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal Server Error: {str(e)}"
        )

@router.get("", response_model=List[InvoiceResponse])
async def list_invoices(
    createdBy: Optional[str] = Query(None, description="Filter invoices by creator UID"),
    status: Optional[str] = Query(None, description="Filter invoices by invoiceStatus"),
    limit: int = Query(50, ge=1, le=100, description="Page limit size")
):
    """
    Lists invoices with optional search filters.
    """
    try:
        return invoice_service.list_invoices(creator_id=createdBy, status=status, limit=limit)
    except Exception as e:
        logger.error(f"Error listing invoices: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal Server Error: {str(e)}"
        )

@router.get("/{id}", response_model=InvoiceResponse)
async def get_invoice_by_id(id: str):
    """
    Retrieves a single invoice by its unique document ID.
    """
    invoice = invoice_service.get_invoice(id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice document with ID '{id}' was not found."
        )
    return invoice

@router.put("/{id}", response_model=InvoiceResponse)
async def update_invoice(id: str, fields: InvoiceUpdate = Body(...)):
    """
    Updates specific invoice metadata fields.
    """
    try:
        # Validate updated dates if both are provided
        if fields.invoiceDate and fields.dueDate:
            if not InvoiceUtils.validate_dates(fields.invoiceDate, fields.dueDate):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Due date must be on or after the invoice date."
                )
        
        # Validate GST fields if provided
        if fields.sellerGST and not InvoiceUtils.validate_gst(fields.sellerGST):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid Seller GSTIN format: '{fields.sellerGST}'"
            )
        if fields.buyerGST and not InvoiceUtils.validate_gst(fields.buyerGST):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid Buyer GSTIN format: '{fields.buyerGST}'"
            )

        update_dict = fields.model_dump(exclude_unset=True)
        updated_invoice = invoice_service.update_invoice(id, update_dict)
        if not updated_invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Invoice document with ID '{id}' was not found."
            )
        return updated_invoice
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating invoice {id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal Server Error: {str(e)}"
        )

@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_invoice(id: str):
    """
    Removes an invoice document from the database.
    """
    deleted = invoice_service.delete_invoice(id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice document with ID '{id}' was not found or could not be deleted."
        )
    return {"status": "success", "message": f"Successfully deleted invoice '{id}'."}
