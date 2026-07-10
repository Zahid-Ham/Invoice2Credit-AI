import logging
from fastapi import APIRouter, HTTPException, status
from app.listing.services.listing_service import listing_service

logger = logging.getLogger("ListingRoutes")

router = APIRouter(prefix="/v1/marketplace", tags=["Marketplace Listings"])

@router.post(
    "/list/{invoiceId}",
    status_code=status.HTTP_201_CREATED,
    summary="List Invoice on Marketplace",
    description="Validate verification state and list the verified invoice on the DeFi marketplace."
)
async def list_invoice(invoiceId: str):
    try:
        listing = listing_service.list_invoice_on_marketplace(invoiceId)
        return {
            "success": True,
            "message": "Invoice listed on the marketplace successfully.",
            "listing": listing
        }
    except ValueError as val_err:
        logger.warning(f"Invalid listing request: {val_err}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as exc:
        logger.exception(f"Failed to list invoice: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Marketplace listing execution failed: {exc}"
        )


@router.get(
    "/listings",
    status_code=status.HTTP_200_OK,
    summary="Get All Marketplace Listings",
    description="Fetch all active marketplace listings from Firestore."
)
async def get_listings():
    try:
        listings = listing_service.get_all_listings()
        return {
            "success": True,
            "count": len(listings),
            "listings": listings
        }
    except Exception as exc:
        logger.exception(f"Failed to fetch listings: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve listings: {exc}"
        )


@router.get(
    "/listings/{invoiceId}",
    status_code=status.HTTP_200_OK,
    summary="Get Single Marketplace Listing",
    description="Fetch a single marketplace listing by invoice ID."
)
async def get_listing(invoiceId: str):
    try:
        listing = listing_service.get_listing_by_id(invoiceId)
        if not listing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Listing for invoice {invoiceId} not found."
            )
        return {"success": True, "listing": listing}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(f"Failed to fetch listing {invoiceId}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve listing: {exc}"
        )


@router.post(
    "/bid/{invoiceId}",
    status_code=status.HTTP_200_OK,
    summary="Place Bid on Listing",
    description="Record an investor bid on an active marketplace listing."
)
async def place_bid(invoiceId: str, bid_data: dict):
    try:
        result = listing_service.place_bid(invoiceId, bid_data)
        return {"success": True, "message": "Bid placed successfully.", "listing": result}
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as exc:
        logger.exception(f"Failed to place bid: {exc}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))

