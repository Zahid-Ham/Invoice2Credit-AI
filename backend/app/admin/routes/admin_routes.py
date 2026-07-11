import logging
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status as fastapi_status, Query

from app.admin.services.admin_service import admin_service
from app.admin.schemas.admin import VerifyBusinessRequest, SuspendUserRequest, ApproveListingRequest, AdminDashboardResponse

logger = logging.getLogger("AdminRoutes")

router = APIRouter(prefix="/v1/admin", tags=["Platform Administrator APIs"])

@router.get("/dashboard", response_model=AdminDashboardResponse)
async def get_dashboard():
    """
    Get aggregated protocol dashboard details (users count, transaction values).
    """
    try:
        return admin_service.get_dashboard_data()
    except Exception as exc:
        logger.exception(f"Failed to fetch admin dashboard: {exc}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Dashboard aggregation failed: {exc}"
        )

@router.get("/users", response_model=List[Dict[str, Any]])
async def get_users():
    """
    Retrieve all registered user profiles on the platform.
    """
    try:
        return admin_service.get_users()
    except Exception as exc:
        logger.exception(f"Failed to fetch users list: {exc}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve users: {exc}"
        )

@router.get("/invoices", response_model=List[Dict[str, Any]])
async def get_invoices():
    """
    Retrieve all supplier invoices.
    """
    try:
        return admin_service.get_invoices()
    except Exception as exc:
        logger.exception(f"Failed to fetch invoices: {exc}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve invoices: {exc}"
        )

@router.get("/marketplace", response_model=List[Dict[str, Any]])
async def get_marketplace():
    """
    Retrieve all marketplace listings.
    """
    try:
        return admin_service.get_listings()
    except Exception as exc:
        logger.exception(f"Failed to fetch marketplace: {exc}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve marketplace: {exc}"
        )

@router.get("/analytics")
async def get_analytics():
    """
    Get historical growth analytics.
    """
    try:
        return admin_service.get_analytics()
    except Exception as exc:
        logger.exception(f"Failed to fetch analytics: {exc}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load analytics: {exc}"
        )

@router.post("/verify-business")
async def verify_business(payload: VerifyBusinessRequest):
    """
    KYC verify a supplier or buyer profile.
    """
    try:
        return admin_service.verify_business(payload.userId, payload.verified)
    except Exception as exc:
        logger.exception(f"Failed to verify business: {exc}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify user business: {exc}"
        )

@router.post("/suspend-user")
async def suspend_user(payload: SuspendUserRequest):
    """
    Suspend or reactivate a user profile.
    """
    try:
        return admin_service.suspend_user(payload.userId, payload.suspend)
    except Exception as exc:
        logger.exception(f"Failed to suspend user: {exc}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to change user suspension: {exc}"
        )

@router.post("/approve-listing")
async def approve_listing(payload: ApproveListingRequest):
    """
    Manual override to hide or show listings to investors.
    """
    try:
        return admin_service.approve_listing(payload.listingId, payload.approve)
    except Exception as exc:
        logger.exception(f"Failed to approve listing: {exc}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to approve listing: {exc}"
        )
