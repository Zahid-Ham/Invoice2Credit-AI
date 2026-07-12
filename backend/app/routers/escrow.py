import logging
from fastapi import APIRouter, Depends, HTTPException, status

from app.blockchain.auth import get_current_user_uid
from app.blockchain.config import BLOCKCHAIN_NETWORK
from app.blockchain.provider import blockchain_provider
from app.services.escrow_service import escrow_service
from app.schemas.escrow import (
    EscrowDealResponse,
    PrepareEscrowActionRequest
)
from app.schemas.marketplace import (
    PrepareTransactionResponse,
    UnsignedTransactionPayload
)
from app.blockchain.exceptions import (
    EscrowDealNotFoundError,
    EscrowInvalidStateError,
    EscrowUnauthorizedCallerError,
    TransactionPreparationError,
    ContractUnavailableError
)

logger = logging.getLogger("EscrowRouter")

router = APIRouter(prefix="/v1/escrow", tags=["Escrow & Settlement Operations"])

@router.get("/next-id", response_model=int)
async def get_next_deal_id(
    current_user_uid: str = Depends(get_current_user_uid)
):
    try:
        return escrow_service.get_next_deal_id()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/deals/{dealId}", response_model=EscrowDealResponse)
async def get_deal_details(
    dealId: int,
    current_user_uid: str = Depends(get_current_user_uid)
):
    try:
        return escrow_service.get_deal(dealId)
    except EscrowDealNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ContractUnavailableError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/deals/prepare-fund", response_model=PrepareTransactionResponse)
async def prepare_fund_deal(
    payload: PrepareEscrowActionRequest,
    current_user_uid: str = Depends(get_current_user_uid)
):
    try:
        tx = escrow_service.prepare_fund_deal(
            deal_id=payload.dealId,
            investor_address=payload.callerAddress
        )
        return PrepareTransactionResponse(
            network=BLOCKCHAIN_NETWORK,
            chainId=blockchain_provider.expected_chain_id,
            contract="InvoiceEscrow",
            action="fundDeal",
            transaction=UnsignedTransactionPayload(**tx)
        )
    except EscrowDealNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except (EscrowInvalidStateError, EscrowUnauthorizedCallerError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except TransactionPreparationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except ContractUnavailableError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/deals/prepare-release", response_model=PrepareTransactionResponse)
async def prepare_release_funding(
    payload: PrepareEscrowActionRequest,
    current_user_uid: str = Depends(get_current_user_uid)
):
    try:
        tx = escrow_service.prepare_release_funding(
            deal_id=payload.dealId,
            caller_address=payload.callerAddress
        )
        return PrepareTransactionResponse(
            network=BLOCKCHAIN_NETWORK,
            chainId=blockchain_provider.expected_chain_id,
            contract="InvoiceEscrow",
            action="releaseFundingToMSME",
            transaction=UnsignedTransactionPayload(**tx)
        )
    except EscrowDealNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except EscrowInvalidStateError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except TransactionPreparationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except ContractUnavailableError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/deals/prepare-settle", response_model=PrepareTransactionResponse)
async def prepare_settle_invoice(
    payload: PrepareEscrowActionRequest,
    current_user_uid: str = Depends(get_current_user_uid)
):
    try:
        tx = escrow_service.prepare_settle_invoice(
            deal_id=payload.dealId,
            buyer_address=payload.callerAddress
        )
        return PrepareTransactionResponse(
            network=BLOCKCHAIN_NETWORK,
            chainId=blockchain_provider.expected_chain_id,
            contract="InvoiceEscrow",
            action="settleInvoice",
            transaction=UnsignedTransactionPayload(**tx)
        )
    except EscrowDealNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except (EscrowInvalidStateError, EscrowUnauthorizedCallerError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except TransactionPreparationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except ContractUnavailableError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
