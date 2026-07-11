import logging
from typing import List
from fastapi import APIRouter, HTTPException, status as fastapi_status, Query, Body

from app.marketplace.bidding.services.bidding_service import bidding_service
from app.marketplace.bidding.schemas.bidding import BidCreateRequest, BidResponse, InvestmentResponse

logger = logging.getLogger("BiddingRoutes")

router = APIRouter(tags=["Investor Bidding Engine"])

@router.post("/v1/marketplace/{listingId}/bid", response_model=BidResponse, status_code=fastapi_status.HTTP_201_CREATED)
async def place_bid(listingId: str, payload: BidCreateRequest):
    """
    Submit a new financing bid on an active marketplace invoice listing.
    Enforces investor role authentication, status checks, and yield limits.
    """
    try:
        bid = bidding_service.place_bid(
            listing_id=listingId,
            investor_id=payload.investorId,
            bid_amount=payload.bidAmount,
            expected_yield=payload.expectedYield
        )
        return bid
    except ValueError as ve:
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as exc:
        logger.exception(f"Failed to place bid: {exc}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bidding failure: {exc}"
        )

@router.get("/v1/marketplace/{listingId}/bids", response_model=List[BidResponse])
async def get_listing_bids(listingId: str):
    """
    Retrieve all bid history details for a specific invoice listing.
    """
    try:
        return bidding_service.get_bids_for_listing(listingId)
    except Exception as exc:
        logger.exception(f"Failed to fetch bids for listing {listingId}: {exc}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch listing bids: {exc}"
        )

@router.get("/v1/investor/my-bids", response_model=List[BidResponse])
async def get_my_bids(investorId: str = Query(..., description="Authenticated investor user ID")):
    """
    Retrieve all bids submitted by the authenticated investor.
    """
    try:
        return bidding_service.get_bids_for_investor(investorId)
    except Exception as exc:
        logger.exception(f"Failed to fetch bids for investor {investorId}: {exc}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve bids: {exc}"
        )

@router.get("/v1/investor/my-investments", response_model=List[InvestmentResponse])
async def get_my_investments(investorId: str = Query(..., description="Authenticated investor user ID")):
    """
    Retrieve all funded invoice investments for the authenticated investor.
    """
    try:
        return bidding_service.get_investments_for_investor(investorId)
    except Exception as exc:
        logger.exception(f"Failed to fetch investments for investor {investorId}: {exc}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve investments: {exc}"
        )
