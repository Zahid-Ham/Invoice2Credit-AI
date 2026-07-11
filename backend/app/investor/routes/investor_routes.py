import logging
from typing import List
from fastapi import APIRouter, HTTPException, status as fastapi_status, Query

from app.investor.services.investor_service import investor_service
from app.investor.schemas.investor import InvestorDashboardResponse, InvestorPortfolioResponse, TransactionItem, InvestorPerformanceResponse

logger = logging.getLogger("InvestorRoutes")

router = APIRouter(prefix="/v1/investor", tags=["Investor Workspace APIs"])

@router.get("/dashboard", response_model=InvestorDashboardResponse)
async def get_dashboard(investorId: str = Query(..., description="Unique UID of the authenticated investor")):
    """
    Get aggregated dashboard stats for the investor.
    """
    try:
        return investor_service.get_dashboard_data(investorId)
    except Exception as exc:
        logger.exception(f"Failed to compile investor dashboard: {exc}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Dashboard aggregation failed: {exc}"
        )

@router.get("/portfolio", response_model=InvestorPortfolioResponse)
async def get_portfolio(investorId: str = Query(..., description="Unique UID of the authenticated investor")):
    """
    Get full holding details and sector allocations for the investor.
    """
    try:
        return investor_service.get_portfolio_data(investorId)
    except Exception as exc:
        logger.exception(f"Failed to fetch investor portfolio: {exc}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Portfolio load failed: {exc}"
        )

@router.get("/transactions", response_model=List[TransactionItem])
async def get_transactions(investorId: str = Query(..., description="Unique UID of the authenticated investor")):
    """
    Retrieve transaction logs for the investor.
    """
    try:
        return investor_service.get_transaction_ledger(investorId)
    except Exception as exc:
        logger.exception(f"Failed to load transaction ledger: {exc}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transaction loading failed: {exc}"
        )

@router.get("/performance", response_model=InvestorPerformanceResponse)
async def get_performance(investorId: str = Query(..., description="Unique UID of the authenticated investor")):
    """
    Retrieve historical ROI metrics and yield parameters.
    """
    try:
        return investor_service.get_performance_data(investorId)
    except Exception as exc:
        logger.exception(f"Failed to compile performance index: {exc}")
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Performance loading failed: {exc}"
        )
