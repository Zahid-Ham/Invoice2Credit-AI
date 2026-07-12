import logging
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.blockchain.auth import get_current_user_uid
from app.blockchain.config import BLOCKCHAIN_NETWORK
from app.blockchain.provider import blockchain_provider
from app.services.marketplace_service import marketplace_service
from app.schemas.marketplace import (
    AuctionResponse,
    BidResponse,
    CreateAuctionRequest,
    PlaceBidRequest,
    CloseAuctionRequest,
    PrepareTransactionResponse,
    UnsignedTransactionPayload
)
from app.blockchain.exceptions import (
    MarketplaceListingNotFoundError,
    MarketplaceListingInactiveError,
    MarketplaceUnauthorizedCallerError,
    MarketplaceInvalidBidError,
    TransactionPreparationError,
    ContractUnavailableError
)

logger = logging.getLogger("MarketplaceRouter")

router = APIRouter(prefix="/v1/marketplace", tags=["Marketplace Operations"])

@router.get("/next-id", response_model=int)
async def get_next_auction_id(
    current_user_uid: str = Depends(get_current_user_uid)
):
    try:
        return marketplace_service.get_next_auction_id()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/active-auction/{tokenId}", response_model=int)
async def get_active_auction_for_token(
    tokenId: int,
    current_user_uid: str = Depends(get_current_user_uid)
):
    try:
        return marketplace_service.get_active_auction_for_token(tokenId)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/auctions/{auctionId}", response_model=AuctionResponse)
async def get_auction_details(
    auctionId: int,
    current_user_uid: str = Depends(get_current_user_uid)
):
    try:
        return marketplace_service.get_auction(auctionId)
    except MarketplaceListingNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ContractUnavailableError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/auctions/{auctionId}/bids", response_model=List[BidResponse])
async def get_auction_bids(
    auctionId: int,
    current_user_uid: str = Depends(get_current_user_uid)
):
    try:
        return marketplace_service.get_bids(auctionId)
    except MarketplaceListingNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ContractUnavailableError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/auctions/prepare-create", response_model=PrepareTransactionResponse)
async def prepare_create_auction(
    payload: CreateAuctionRequest,
    current_user_uid: str = Depends(get_current_user_uid)
):
    try:
        tx = marketplace_service.prepare_create_auction(
            token_id=payload.tokenId,
            minimum_funding_amount=payload.minimumFundingAmount,
            duration=payload.duration,
            seller_address=payload.sellerAddress
        )
        return PrepareTransactionResponse(
            network=BLOCKCHAIN_NETWORK,
            chainId=blockchain_provider.expected_chain_id,
            contract="InvoiceMarketplace",
            action="createAuction",
            transaction=UnsignedTransactionPayload(**tx)
        )
    except (MarketplaceListingInactiveError, MarketplaceUnauthorizedCallerError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except TransactionPreparationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except ContractUnavailableError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/auctions/prepare-bid", response_model=PrepareTransactionResponse)
async def prepare_place_bid(
    payload: PlaceBidRequest,
    current_user_uid: str = Depends(get_current_user_uid)
):
    try:
        tx = marketplace_service.prepare_place_bid(
            auction_id=payload.auctionId,
            funding_amount=payload.fundingAmount,
            discount_rate=payload.discountRate,
            bidder_address=payload.bidderAddress
        )
        return PrepareTransactionResponse(
            network=BLOCKCHAIN_NETWORK,
            chainId=blockchain_provider.expected_chain_id,
            contract="InvoiceMarketplace",
            action="placeBid",
            transaction=UnsignedTransactionPayload(**tx)
        )
    except MarketplaceListingNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except (MarketplaceListingInactiveError, MarketplaceUnauthorizedCallerError, MarketplaceInvalidBidError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except TransactionPreparationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except ContractUnavailableError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/auctions/prepare-close", response_model=PrepareTransactionResponse)
async def prepare_close_auction(
    payload: CloseAuctionRequest,
    current_user_uid: str = Depends(get_current_user_uid)
):
    try:
        tx = marketplace_service.prepare_close_auction(
            auction_id=payload.auctionId,
            caller_address=payload.callerAddress
        )
        return PrepareTransactionResponse(
            network=BLOCKCHAIN_NETWORK,
            chainId=blockchain_provider.expected_chain_id,
            contract="InvoiceMarketplace",
            action="closeAuction",
            transaction=UnsignedTransactionPayload(**tx)
        )
    except MarketplaceListingNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except MarketplaceListingInactiveError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except TransactionPreparationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except ContractUnavailableError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


from pydantic import BaseModel, Field

class ApproveMarketplaceRequest(BaseModel):
    tokenId: int = Field(..., description="The ERC-721 token ID to approve")
    ownerAddress: str = Field(..., description="The owner address of the NFT")


@router.post("/auctions/prepare-approve", response_model=PrepareTransactionResponse)
async def prepare_approve_marketplace(
    payload: ApproveMarketplaceRequest,
    current_user_uid: str = Depends(get_current_user_uid)
):
    """
    Prepares a transaction payload to approve the marketplace contract
    to manage/transfer a given NFT tokenId on behalf of the owner.
    """
    try:
        from app.blockchain.contracts import get_invoice_nft_contract, get_invoice_marketplace_contract
        from app.blockchain.transaction_builder import build_unsigned_transaction
        
        nft = get_invoice_nft_contract()
        mkt = get_invoice_marketplace_contract()
        
        # Check if already approved to skip
        try:
            current_approved = nft.functions.getApproved(payload.tokenId).call()
            if current_approved.lower() == mkt.address.lower():
                # Already approved: return a dummy/null transaction or success payload
                pass
        except Exception:
            pass
            
        func = nft.functions.approve(mkt.address, payload.tokenId)
        tx = build_unsigned_transaction(
            from_address=payload.ownerAddress,
            to_address=nft.address,
            contract_function=func
        )
        return PrepareTransactionResponse(
            network=BLOCKCHAIN_NETWORK,
            chainId=blockchain_provider.expected_chain_id,
            contract="InvoiceNFT",
            action="approve",
            transaction=UnsignedTransactionPayload(**tx)
        )
    except Exception as e:
        logger.exception(f"Failed to prepare approval: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to prepare approval transaction: {e}"
        )


@router.get("/tokens/{tokenId}/approved", response_model=bool)
async def check_token_approved(
    tokenId: int,
    current_user_uid: str = Depends(get_current_user_uid)
):
    try:
        from app.blockchain.contracts import get_invoice_nft_contract, get_invoice_marketplace_contract
        nft = get_invoice_nft_contract()
        mkt = get_invoice_marketplace_contract()
        approved = nft.functions.getApproved(tokenId).call()
        return approved.lower() == mkt.address.lower()
    except Exception:
        return False


