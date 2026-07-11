import logging
from typing import List
from fastapi import APIRouter, HTTPException, status as fastapi_status, Query

from app.buyer.services.buyer_service import buyer_service
from app.buyer.schemas.buyer import BuyerDashboardResponse, BuyerInvoiceItem

logger = logging.getLogger("BuyerRoutes")

router = APIRouter(prefix="/v1/buyer", tags=["Corporate Buyer APIs"])

@router.get("/dashboard", response_model=BuyerDashboardResponse)
async def get_dashboard(buyerName: str = Query(..., description="Corporate Buyer identifier name")):
    """
    Get aggregated outstanding balance statistics and pending metrics for a Buyer.
    """
    try:
        return buyer_service.get_dashboard_data(buyerName)
    except Exception as exc:
        logger.exception(f"Failed to fetch buyer dashboard: {exc}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Dashboard aggregation failed: {exc}"
        )

@router.get("/invoices", response_model=List[BuyerInvoiceItem])
async def get_invoices(buyerName: str = Query(..., description="Corporate Buyer identifier name")):
    """
    Get invoices pending buyer confirmation or approval status.
    """
    try:
        return buyer_service.get_invoices(buyerName)
    except Exception as exc:
        logger.exception(f"Failed to fetch invoices for buyer: {exc}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch buyer invoices: {exc}"
        )

@router.post("/approve/{invoiceId}")
async def approve_invoice(invoiceId: str):
    """
    Formally confirm delivery and approve payment verification parameters for an invoice.
    """
    try:
        return buyer_service.approve_invoice(invoiceId)
    except ValueError as ve:
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as exc:
        logger.exception(f"Failed to approve invoice: {exc}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to approve invoice: {exc}"
        )

@router.post("/reject/{invoiceId}")
async def reject_invoice(invoiceId: str):
    """
    Reject verification parameters for an invoice.
    """
    try:
        return buyer_service.reject_invoice(invoiceId)
    except ValueError as ve:
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as exc:
        logger.exception(f"Failed to reject invoice: {exc}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reject invoice: {exc}"
        )

@router.post("/payment/{invoiceId}")
async def settle_payment(invoiceId: str):
    """
    Settle raw invoice. Triggers escrow payout and closes investor listings.
    """
    try:
        return buyer_service.settle_payment(invoiceId)
    except ValueError as ve:
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as exc:
        logger.exception(f"Failed to settle payment: {exc}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to settle payment: {exc}"
        )
