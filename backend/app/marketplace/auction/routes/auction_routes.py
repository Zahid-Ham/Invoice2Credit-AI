import logging
from fastapi import APIRouter, HTTPException, status as fastapi_status

from app.marketplace.auction.services.auction_service import auction_service
from app.marketplace.auction.schemas.auction import AuctionStartRequest, AuctionCloseRequest, AuctionResponse

logger = logging.getLogger("AuctionRoutes")

router = APIRouter(prefix="/v1/auction", tags=["Auction Management Engine"])

@router.post("/start", response_model=AuctionResponse, status_code=fastapi_status.HTTP_201_CREATED)
async def start_auction(payload: AuctionStartRequest):
    """
    Launch a live marketplace financing auction for a verified invoice.
    """
    try:
        auction = auction_service.start_auction(
            invoice_id=payload.invoiceId,
            duration_hours=payload.durationHours
        )
        return auction
    except ValueError as ve:
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as exc:
        logger.exception(f"Failed to start auction: {exc}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Auction start failed: {exc}"
        )

@router.post("/close", response_model=AuctionResponse)
async def close_auction(payload: AuctionCloseRequest):
    """
    Settle and close an active auction, finalizing winning investment structures.
    """
    try:
        auction = auction_service.close_auction(auction_id=payload.auctionId)
        return auction
    except ValueError as ve:
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as exc:
        logger.exception(f"Failed to close auction: {exc}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Auction closure failed: {exc}"
        )

@router.get("/{id}", response_model=AuctionResponse)
async def get_auction_details(id: str):
    """
    Get live analytics and details of an auction by ID.
    """
    try:
        return auction_service.get_auction_analytics(id)
    except ValueError as ve:
        raise HTTPException(
            status_code=fastapi_status.HTTP_404_NOT_FOUND,
            detail=str(ve)
        )
    except Exception as exc:
        logger.exception(f"Failed to retrieve auction details: {exc}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load auction parameters: {exc}"
        )
