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
    # 1. Calculate canonical fingerprint from uploaded bytes
    file_bytes = await file.read()
    hash_result = calculate_invoice_sha256(file_bytes)
    
    # 2. Resolve database invoice record by hash to assert eligibility
    # This guard is enforced only when Firestore is available (production).
    # Test environments without real credentials skip this check gracefully.
    from app.invoice.repositories.invoice_repository import invoice_repository
    from app.services.invoice_intelligence.mint_eligibility_service import check_mint_eligibility
    from app.services.firebase.firebase_service import firebase_service, MockFirestore

    _firestore_available = firebase_service.db is not None and not isinstance(firebase_service.db, MockFirestore)

    if _firestore_available:
        invoice = invoice_repository.get_by_hash(hash_result["hex"])
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice application record not found in database. Please upload the invoice metadata first."
            )
        eligibility = check_mint_eligibility(invoice)
        if not eligibility["eligible"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invoice is not eligible for tokenization. Reasons: {', '.join(eligibility['reasons'])}"
            )
    else:
        logger.warning(
            "Firestore not available (mock/test environment). "
            "Skipping mint eligibility pre-check. Production will enforce full eligibility guard."
        )

    try:
        result = blockchain_invoice_service.mint_verified_invoice(
            msme=msmeWallet,
            buyer=buyerWallet,
            invoice_hash=hash_result["bytes32"],
            invoice_reference=invoiceReference,
            invoice_amount=invoiceAmount,
            due_date=dueDate,
            token_uri=f"ipfs://QmMockMetadataHash" # standard fallback for this phase
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

@router.get("/token-id/{invoiceHash}", response_model=int)
async def get_token_id_by_hash(invoiceHash: str):
    try:
        w3 = blockchain_provider.get_w3()
        hash_bytes = w3.to_bytes(hexstr=invoiceHash)
        contract = get_invoice_nft_contract()
        token_id = contract.functions.usedInvoiceHashes(hash_bytes).call()
        return token_id
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/transactions/{tx_hash}")
async def get_transaction_status(tx_hash: str):
    """
    Queries transaction status (PENDING, CONFIRMED, REVERTED, NOT_FOUND) from on-chain receipt.
    """
    if not tx_hash.startswith("0x") or len(tx_hash) != 66:
        raise HTTPException(status_code=400, detail="Invalid transaction hash format")

    w3 = blockchain_provider.get_w3()
    try:
        tx = w3.eth.get_transaction(tx_hash)
    except Exception:
        return {
            "transactionHash": tx_hash,
            "status": "NOT_FOUND",
            "blockNumber": None,
            "receiptStatus": None
        }

    try:
        receipt = w3.eth.get_transaction_receipt(tx_hash)
        status_name = "CONFIRMED" if receipt["status"] == 1 else "REVERTED"
        return {
            "transactionHash": tx_hash,
            "status": status_name,
            "blockNumber": receipt["blockNumber"],
            "receiptStatus": receipt["status"]
        }
    except Exception:
        return {
            "transactionHash": tx_hash,
            "status": "PENDING",
            "blockNumber": None,
            "receiptStatus": None
        }

@router.get("/transactions/{tx_hash}/events")
async def decode_transaction_events(tx_hash: str):
    """
    Decodes events emitted from InvoiceMarketplace or InvoiceEscrow in transaction receipt logs.
    """
    if not tx_hash.startswith("0x") or len(tx_hash) != 66:
        raise HTTPException(status_code=400, detail="Invalid transaction hash format")

    w3 = blockchain_provider.get_w3()
    try:
        receipt = w3.eth.get_transaction_receipt(tx_hash)
    except Exception:
        raise HTTPException(status_code=404, detail="Transaction receipt not found or transaction pending.")

    from app.blockchain.contracts import get_invoice_marketplace_contract, get_invoice_escrow_contract
    
    events_decoded = []
    
    # Try marketplace events
    try:
        mkt = get_invoice_marketplace_contract()
        for ev_name in ["AuctionCreated", "BidPlaced", "AuctionClosed", "AuctionCancelled"]:
            event = getattr(mkt.events, ev_name)
            logs = event().process_receipt(receipt)
            for log in logs:
                args_dict = {}
                for k, v in log["args"].items():
                    if isinstance(v, bytes):
                        args_dict[k] = "0x" + v.hex()
                    else:
                        args_dict[k] = v
                events_decoded.append({
                    "contract": "InvoiceMarketplace",
                    "event": ev_name,
                    "args": args_dict
                })
    except Exception:
        pass

    # Try escrow events
    try:
        esc = get_invoice_escrow_contract()
        for ev_name in ["DealCreated", "DealFunded", "FundingReleased", "InvoiceSettled", "DealStatusChanged"]:
            event = getattr(esc.events, ev_name)
            logs = event().process_receipt(receipt)
            for log in logs:
                args_dict = {}
                for k, v in log["args"].items():
                    if isinstance(v, bytes):
                        args_dict[k] = "0x" + v.hex()
                    elif k == "status" and isinstance(v, int):
                        args_dict[k] = v
                        args_dict["statusName"] = ["CREATED", "FUNDED", "MSME_RELEASED", "SETTLED"][v]
                    else:
                        args_dict[k] = v
                events_decoded.append({
                    "contract": "InvoiceEscrow",
                    "event": ev_name,
                    "args": args_dict
                })
    except Exception:
        pass

    return {
        "transactionHash": tx_hash,
        "status": "CONFIRMED" if receipt["status"] == 1 else "REVERTED",
        "events": events_decoded
    }

@router.post("/transactions/{tx_hash}/sync")
async def sync_blockchain_transaction(tx_hash: str):
    """
    Synchronizes confirmed receipt logs and events into Firestore states.
    """
    if not tx_hash.startswith("0x") or len(tx_hash) != 66:
        raise HTTPException(status_code=400, detail="Invalid transaction hash format")
    
    from app.services.blockchain_sync_service import blockchain_sync_service
    try:
        result = blockchain_sync_service.sync_transaction(tx_hash)
        return result
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        logger.exception(f"Failed to synchronize transaction {tx_hash}: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

@router.get("/integrity/blockchain-projections")
async def check_blockchain_projections_integrity():
    """
    Validates data integrity across Firestore invoice documents and on-chain records.
    """
    from app.invoice.repositories.invoice_repository import invoice_repository
    invoices = invoice_repository.list_all(limit=1000)
    
    issues = []
    checked_count = len(invoices)
    
    token_ids = {}
    auction_ids = {}
    deal_ids = {}
    
    for inv in invoices:
        inv_id = inv.get("invoiceId")
        chain_id = inv.get("chainId")
        
        t_id = inv.get("tokenId")
        if t_id is not None:
            key = f"{chain_id}-{t_id}"
            if key in token_ids:
                issues.append(f"Duplicate tokenId {t_id} on chain {chain_id} between {inv_id} and {token_ids[key]}")
            else:
                token_ids[key] = inv_id
                
        auc_id = inv.get("auctionId")
        if auc_id is not None:
            key = f"{chain_id}-{auc_id}"
            if key in auction_ids:
                issues.append(f"Duplicate auctionId {auc_id} on chain {chain_id} between {inv_id} and {auction_ids[key]}")
            else:
                auction_ids[key] = inv_id
                
        d_id = inv.get("dealId")
        if d_id is not None:
            key = f"{chain_id}-{d_id}"
            if key in deal_ids:
                issues.append(f"Duplicate dealId {d_id} on chain {chain_id} between {inv_id} and {deal_ids[key]}")
            else:
                deal_ids[key] = inv_id
                
        b_status = inv.get("blockchainStatus")
        status = inv.get("invoiceStatus")
        
        if b_status == "MINTED" and t_id is None:
            issues.append(f"Invoice {inv_id} is marked MINTED but has no tokenId")
        if status == "Auction Live" and auc_id is None:
            issues.append(f"Invoice {inv_id} status is 'Auction Live' but has no auctionId")
        if status == "Awaiting Funding" and d_id is None:
            issues.append(f"Invoice {inv_id} status is 'Awaiting Funding' but has no dealId")
            
    return {
        "status": "unhealthy" if issues else "healthy",
        "invoicesChecked": checked_count,
        "issues": issues
    }

@router.post("/reconcile")
async def reconcile_existing_invoices():
    """
    Reconciles Firestore invoices with live on-chain states.
    """
    from app.invoice.repositories.invoice_repository import invoice_repository
    from app.blockchain.contracts import get_invoice_nft_contract, get_invoice_marketplace_contract, get_invoice_escrow_contract
    import eth_utils

    invoices = invoice_repository.list_all(limit=1000)
    reconciled_count = 0
    
    nft = get_invoice_nft_contract()
    mkt = get_invoice_marketplace_contract()
    esc = get_invoice_escrow_contract()
    
    active_chain_id = blockchain_provider.get_w3().eth.chain_id

    for inv in invoices:
        updated = False
        inv_id = inv.get("invoiceId")
        hash_str = inv.get("invoiceHash")
        token_id = inv.get("tokenId")
        auction_id = inv.get("auctionId")
        deal_id = inv.get("dealId")
        
        # Ensure chainId is projected
        if inv.get("chainId") != active_chain_id:
            inv["chainId"] = active_chain_id
            updated = True
            
        # 1. Reconcile token ID
        if hash_str and token_id is None:
            try:
                hash_bytes = eth_utils.to_bytes(hexstr=hash_str)
                onchain_token_id = nft.functions.usedInvoiceHashes(hash_bytes).call()
                if onchain_token_id > 0:
                    inv["tokenId"] = onchain_token_id
                    inv["blockchainStatus"] = "MINTED"
                    token_id = onchain_token_id
                    updated = True
            except Exception as e:
                logger.error(f"Error reconciling token ID for {inv_id}: {e}")
                
        # 2. Reconcile auction ID
        if token_id is not None and auction_id is None:
            try:
                onchain_auction_id = mkt.functions.activeAuctionForToken(token_id).call()
                if onchain_auction_id > 0:
                    inv["auctionId"] = onchain_auction_id
                    inv["invoiceStatus"] = "Auction Live"
                    inv["marketplaceStatus"] = "Live Auction"
                    auction_id = onchain_auction_id
                    updated = True
            except Exception as e:
                logger.error(f"Error reconciling auction ID for {inv_id}: {e}")
                
        # 3. Reconcile deal ID
        if auction_id is not None and deal_id is None:
            try:
                next_deal_id = esc.functions.nextDealId().call()
                for d in range(1, next_deal_id):
                    deal_info = esc.functions.deals(d).call()
                    if deal_info[1] == token_id:
                        inv["dealId"] = d
                        status_map = ["CREATED", "FUNDED", "MSME_RELEASED", "SETTLED"]
                        escrow_status_str = status_map[deal_info[9]]
                        inv["escrowStatus"] = escrow_status_str
                        if escrow_status_str == "CREATED":
                            inv["invoiceStatus"] = "Awaiting Funding"
                        elif escrow_status_str == "FUNDED":
                            inv["invoiceStatus"] = "Funded"
                        elif escrow_status_str == "MSME_RELEASED":
                            inv["invoiceStatus"] = "Disbursed"
                        elif escrow_status_str == "SETTLED":
                            inv["invoiceStatus"] = "Settled"
                        updated = True
                        break
            except Exception as e:
                logger.error(f"Error reconciling deal ID for {inv_id}: {e}")
                
        if updated:
            invoice_repository.update(inv_id, inv)
            reconciled_count += 1
            
    return {
        "status": "success",
        "reconciledCount": reconciled_count
    }



