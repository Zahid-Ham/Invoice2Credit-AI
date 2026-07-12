import logging
from typing import Dict, Any, Optional
from app.services.firebase.firebase_service import firebase_service
from app.invoice.repositories.invoice_repository import invoice_repository
from app.blockchain.provider import blockchain_provider
from app.blockchain.contracts import (
    get_invoice_nft_contract,
    get_invoice_marketplace_contract,
    get_invoice_escrow_contract
)

logger = logging.getLogger("BlockchainSyncService")

class BlockchainSyncService:
    @property
    def db(self):
        if not firebase_service.db:
            raise RuntimeError("Firestore is not initialized.")
        return firebase_service.db

    def get_transaction_sync_record(self, tx_hash: str) -> Optional[Dict[str, Any]]:
        doc = self.db.collection("blockchainTransactions").document(tx_hash).get()
        if doc.exists:
            return doc.to_dict()
        return None

    def save_transaction_sync_record(self, tx_hash: str, record: Dict[str, Any]):
        self.db.collection("blockchainTransactions").document(tx_hash).set(record)
        logger.info(f"Saved sync record for transaction: {tx_hash}")

    def sync_transaction(self, tx_hash: str) -> Dict[str, Any]:
        """
        Synchronizes a confirmed blockchain transaction's events into Firestore.
        This operation is fully idempotent.
        """
        # 1. Check idempotency record
        existing = self.get_transaction_sync_record(tx_hash)
        if existing:
            logger.info(f"Transaction {tx_hash} already synchronized.")
            return existing

        w3 = blockchain_provider.get_w3()
        try:
            receipt = w3.eth.get_transaction_receipt(tx_hash)
        except Exception as e:
            raise ValueError(f"Failed to retrieve transaction receipt for {tx_hash}: {str(e)}")

        if receipt["status"] != 1:
            raise ValueError(f"Transaction {tx_hash} is reverted on-chain. Cannot synchronize.")

        chain_id = w3.eth.chain_id
        network = blockchain_provider.network
        block_number = receipt["blockNumber"]

        events_processed = []
        updated_invoice_id = None
        new_status = None

        # Helper to decode and process events for a contract
        # 1. NFT Contract
        nft = get_invoice_nft_contract()
        try:
            minted_logs = nft.events.InvoiceMinted().process_receipt(receipt)
            for log in minted_logs:
                args = log["args"]
                tx_hash_hex = "0x" + args["invoiceHash"].hex()
                inv = invoice_repository.get_by_hash(tx_hash_hex)
                if not inv:
                    logger.warning(f"No invoice resolved for hash {tx_hash_hex}")
                    continue

                updated_invoice_id = inv["invoiceId"]
                new_status = "TOKENIZED"
                invoice_repository.update(updated_invoice_id, {
                    "tokenId": str(args["tokenId"]),
                    "blockchainStatus": "MINTED",
                    "mintTransactionHash": tx_hash,
                    "mintBlockNumber": block_number,
                    "network": network,
                    "chainId": chain_id,
                    "invoiceStatus": "Verified" # Mark as Verified in standard status
                })
                events_processed.append("InvoiceMinted")
        except Exception as e:
            logger.error(f"Error checking NFT logs: {e}")

        # 2. Marketplace Contract
        mkt = get_invoice_marketplace_contract()
        try:
            # AuctionCreated
            created_logs = mkt.events.AuctionCreated().process_receipt(receipt)
            for log in created_logs:
                args = log["args"]
                inv = invoice_repository.get_by_token_id(chain_id, int(args["tokenId"]))
                if not inv:
                    raise ValueError(f"No invoice resolved for tokenId {args['tokenId']}")

                updated_invoice_id = inv["invoiceId"]
                new_status = "FINANCING_OPEN"
                invoice_repository.update(updated_invoice_id, {
                    "auctionId": str(args["auctionId"]),
                    "invoiceStatus": "Auction Live",
                    "marketplaceStatus": "Live Auction",
                    "updatedAt": blockchain_provider.get_w3().eth.get_block(block_number)["timestamp"]
                })
                # Update marketplace collection
                self.db.collection("marketplace").document(updated_invoice_id).update({
                    "status": "Live Auction",
                    "auctionId": str(args["auctionId"])
                })
                events_processed.append("AuctionCreated")

            # AuctionClosed
            closed_logs = mkt.events.AuctionClosed().process_receipt(receipt)
            for log in closed_logs:
                args = log["args"]
                inv = invoice_repository.get_by_auction_id(chain_id, int(args["auctionId"]))
                if not inv:
                    raise ValueError(f"No invoice resolved for auctionId {args['auctionId']}")

                updated_invoice_id = inv["invoiceId"]
                new_status = "FINANCING_PARTNER_SELECTED"
                invoice_repository.update(updated_invoice_id, {
                    "dealId": str(args["dealId"]),
                    "winningInvestor": args["winner"],
                    "fundingAmount": str(args["fundingAmount"]),
                    "discountRate": int(args["discountRate"]),
                    "invoiceStatus": "Awaiting Funding",
                    "marketplaceStatus": "Closed"
                })
                self.db.collection("marketplace").document(updated_invoice_id).update({
                    "status": "Closed",
                    "winningInvestor": args["winner"]
                })
                events_processed.append("AuctionClosed")

            # AuctionCancelled
            cancelled_logs = mkt.events.AuctionCancelled().process_receipt(receipt)
            for log in cancelled_logs:
                args = log["args"]
                inv = invoice_repository.get_by_auction_id(chain_id, int(args["auctionId"]))
                if not inv:
                    raise ValueError(f"No invoice resolved for auctionId {args['auctionId']}")

                updated_invoice_id = inv["invoiceId"]
                new_status = "CANCELLED"
                invoice_repository.update(updated_invoice_id, {
                    "invoiceStatus": "Cancelled",
                    "marketplaceStatus": "Cancelled"
                })
                self.db.collection("marketplace").document(updated_invoice_id).update({
                    "status": "Cancelled"
                })
                events_processed.append("AuctionCancelled")
        except Exception as e:
            logger.error(f"Error checking Marketplace logs: {e}")
            if not events_processed:
                raise

        # 3. Escrow Contract
        esc = get_invoice_escrow_contract()
        try:
            # DealCreated
            deal_created_logs = esc.events.DealCreated().process_receipt(receipt)
            for log in deal_created_logs:
                args = log["args"]
                inv = invoice_repository.get_by_token_id(chain_id, int(args["invoiceTokenId"]))
                if not inv:
                    raise ValueError(f"No invoice resolved for tokenId {args['invoiceTokenId']}")

                updated_invoice_id = inv["invoiceId"]
                new_status = "AWAITING_INVESTOR_FUNDING"
                invoice_repository.update(updated_invoice_id, {
                    "dealId": str(args["dealId"]),
                    "escrowStatus": "CREATED",
                    "invoiceStatus": "Awaiting Funding",
                    "settlementAmount": str(args["settlementAmount"])
                })
                events_processed.append("DealCreated")

            # DealFunded
            funded_logs = esc.events.DealFunded().process_receipt(receipt)
            for log in funded_logs:
                args = log["args"]
                inv = invoice_repository.get_by_deal_id(chain_id, int(args["dealId"]))
                if not inv:
                    raise ValueError(f"No invoice resolved for dealId {args['dealId']}")

                updated_invoice_id = inv["invoiceId"]
                new_status = "FUNDED"
                invoice_repository.update(updated_invoice_id, {
                    "escrowStatus": "FUNDED",
                    "invoiceStatus": "Funded"
                })
                events_processed.append("DealFunded")

            # FundingReleased
            released_logs = esc.events.FundingReleased().process_receipt(receipt)
            for log in released_logs:
                args = log["args"]
                inv = invoice_repository.get_by_deal_id(chain_id, int(args["dealId"]))
                if not inv:
                    raise ValueError(f"No invoice resolved for dealId {args['dealId']}")

                updated_invoice_id = inv["invoiceId"]
                new_status = "FINANCING_DISBURSED"
                invoice_repository.update(updated_invoice_id, {
                    "escrowStatus": "MSME_RELEASED",
                    "invoiceStatus": "Disbursed"
                })
                events_processed.append("FundingReleased")

            # InvoiceSettled
            settled_logs = esc.events.InvoiceSettled().process_receipt(receipt)
            for log in settled_logs:
                args = log["args"]
                inv = invoice_repository.get_by_deal_id(chain_id, int(args["dealId"]))
                if not inv:
                    raise ValueError(f"No invoice resolved for dealId {args['dealId']}")

                updated_invoice_id = inv["invoiceId"]
                new_status = "SETTLED"
                invoice_repository.update(updated_invoice_id, {
                    "escrowStatus": "SETTLED",
                    "invoiceStatus": "Settled"
                })
                events_processed.append("InvoiceSettled")
        except Exception as e:
            logger.error(f"Error checking Escrow logs: {e}")
            if not events_processed:
                raise

        record = {
            "transactionHash": tx_hash,
            "status": "CONFIRMED",
            "blockNumber": block_number,
            "eventsProcessed": events_processed,
            "invoiceId": updated_invoice_id,
            "applicationStatus": new_status,
            "synchronizedAt": w3.eth.get_block(block_number)["timestamp"]
        }

        if events_processed:
            self.save_transaction_sync_record(tx_hash, record)

        return record

blockchain_sync_service = BlockchainSyncService()
