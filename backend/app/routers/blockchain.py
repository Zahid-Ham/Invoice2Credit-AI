import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from typing import Dict, Any

from app.blockchain.config import BLOCKCHAIN_NETWORK
from app.blockchain.provider import blockchain_provider
from app.blockchain.deployment_loader import deployment_loader
from app.blockchain.signer import blockchain_signer
from app.blockchain.contracts import get_invoice_nft_contract
from app.blockchain.auth import require_verifier_role
from app.services.invoice_hash_service import calculate_invoice_sha256
from app.services.blockchain_invoice_service import blockchain_invoice_service
from app.schemas.blockchain import (
    BlockchainHealthResponse,
    ContractAvailabilityResponse,
    InvoiceHashResponse,
    InvoiceMintTransactionResponse
)
from app.blockchain.exceptions import (
    ContractUnavailableError,
    VerifierRoleMissingError,
    DuplicateInvoiceHashError,
    BlockchainConnectionError,
    ChainMismatchError,
    BlockchainReceiptTimeoutError,
    BlockchainTransactionError,
    BlockchainEventParsingError,
    BlockchainConfigurationError,
    DeploymentConfigError,
    ABIFileError,
    BlockchainSignerError
)

logger = logging.getLogger("BlockchainRouter")

router = APIRouter(prefix="/v1/blockchain", tags=["Blockchain Protocol Operations"])

@router.get("/health", response_model=BlockchainHealthResponse)
async def get_blockchain_health():
    """
    Returns live on-chain status of connection, signer role status, and bytecode validation.
    """
    w3 = blockchain_provider.get_w3()
    
    try:
        rpc_connected = w3.is_connected()
        chain_id = w3.eth.chain_id if rpc_connected else 0
    except Exception:
        rpc_connected = False
        chain_id = 0

    signer_configured = blockchain_signer.account is not None
    signer_address = blockchain_signer.address
    
    signer_has_verifier = False
    if signer_configured and rpc_connected:
        try:
            blockchain_signer.check_verifier_role()
            signer_has_verifier = True
        except Exception:
            signer_has_verifier = False

    contracts_status = {}
    for name, info in deployment_loader.contracts.items():
        addr = info["address"]
        available = info["available"]
        
        has_bytecode = False
        if available and rpc_connected:
            try:
                code = w3.eth.get_code(addr)
                has_bytecode = len(code) > 2
            except Exception:
                has_bytecode = False

        contracts_status[name] = ContractAvailabilityResponse(
            available=has_bytecode,
            address=addr
        )

    overall_status = "healthy" if (rpc_connected and contracts_status["InvoiceNFT"].available) else "degraded"

    return BlockchainHealthResponse(
        status=overall_status,
        network=BLOCKCHAIN_NETWORK,
        chainId=chain_id,
        rpcConnected=rpc_connected,
        signerConfigured=signer_configured,
        signerAddress=signer_address,
        signerHasVerifierRole=signer_has_verifier,
        contracts=contracts_status
    )

@router.post("/invoice/hash", response_model=InvoiceHashResponse)
async def hash_invoice(
    file: UploadFile = File(..., description="PDF invoice document to hash"),
    current_user_uid: str = Depends(require_verifier_role)
):
    """
    Determines invoice SHA-256 fingerprint from uploaded bytes and queries the registry
    to check if it was already tokenized.
    """
    file_bytes = await file.read()
    hash_result = calculate_invoice_sha256(file_bytes)
    
    try:
        is_used = blockchain_invoice_service.is_invoice_hash_used(hash_result["bytes32"])
    except ContractUnavailableError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"InvoiceNFT registry unavailable: {e}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Blockchain query failed: {e}"
        )

    return InvoiceHashResponse(
        algorithm=hash_result["algorithm"],
        invoice_hash=hash_result["hex"],
        is_already_tokenized=is_used
    )

@router.post("/invoice/mint", response_model=InvoiceMintTransactionResponse)
async def mint_invoice(
    file: UploadFile = File(..., description="PDF invoice document to tokenize"),
    invoiceReference: str = Form(..., description="Unique public invoice reference"),
    invoiceAmount: int = Form(..., description="Total invoice amount in native units"),
    dueDate: int = Form(..., description="Due date timestamp in seconds"),
    msmeWallet: str = Form(..., description="MSME payout recipient wallet address"),
    buyerWallet: str = Form(..., description="Responsible corporate buyer wallet address"),
    current_user_uid: str = Depends(require_verifier_role)
):
    """
    Secure verifier-only endpoint that performs SHA-256 fingerprinting and executes
    on-chain minting on InvoiceNFT.
    """
    file_bytes = await file.read()
    hash_result = calculate_invoice_sha256(file_bytes)

    try:
        result = blockchain_invoice_service.mint_verified_invoice(
            msme=msmeWallet,
            buyer=buyerWallet,
            invoice_hash=hash_result["bytes32"],
            invoice_reference=invoiceReference,
            invoice_amount=invoiceAmount,
            due_date=dueDate,
            token_uri="ipfs://QmMockMetadataHash" # standard fallback for this phase
        )
        return InvoiceMintTransactionResponse(**result)
    except DuplicateInvoiceHashError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except VerifierRoleMissingError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except (ContractUnavailableError, BlockchainConnectionError, ChainMismatchError, BlockchainConfigurationError, DeploymentConfigError, ABIFileError) as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Blockchain infrastructure unavailable: {e}"
        )
    except BlockchainReceiptTimeoutError as e:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"On-chain transaction timeout: {e}"
        )
    except (BlockchainTransactionError, BlockchainEventParsingError, BlockchainSignerError) as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"On-chain execution failed: {e}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {e}"
        )
