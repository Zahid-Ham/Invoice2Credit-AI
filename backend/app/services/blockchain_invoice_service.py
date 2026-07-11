import logging
from typing import Dict, Any
from web3 import Web3
from eth_utils import to_checksum_address

from app.blockchain.provider import blockchain_provider
from app.blockchain.contracts import get_invoice_nft_contract
from app.blockchain.signer import blockchain_signer
from app.blockchain.exceptions import (
    BlockchainTransactionError,
    BlockchainReceiptTimeoutError,
    BlockchainEventParsingError,
    DuplicateInvoiceHashError,
    VerifierRoleMissingError
)

logger = logging.getLogger("BlockchainInvoiceService")

class BlockchainInvoiceService:
    def get_contract_name(self) -> str:
        try:
            return get_invoice_nft_contract().functions.name().call()
        except Exception as e:
            logger.error(f"Failed to read contract name: {e}")
            raise

    def get_contract_symbol(self) -> str:
        try:
            return get_invoice_nft_contract().functions.symbol().call()
        except Exception as e:
            logger.error(f"Failed to read contract symbol: {e}")
            raise

    def is_invoice_hash_used(self, invoice_hash: bytes) -> bool:
        try:
            return get_invoice_nft_contract().functions.usedInvoiceHashes(invoice_hash).call()
        except Exception as e:
            logger.error(f"Failed to query usedInvoiceHashes: {e}")
            raise

    def get_invoice_record(self, token_id: int) -> Dict[str, Any]:
        try:
            record = get_invoice_nft_contract().functions.invoiceRecords(token_id).call()
            # Solidity struct returns: [tokenId, invoiceHash, invoiceReference, invoiceAmount, dueDate, msme, buyer, verified, mintedAt]
            return {
                "tokenId": record[0],
                "invoiceHash": "0x" + record[1].hex(),
                "invoiceReference": record[2],
                "invoiceAmount": record[3],
                "dueDate": record[4],
                "msme": record[5],
                "buyer": record[6],
                "verified": record[7],
                "mintedAt": record[8]
            }
        except Exception as e:
            logger.error(f"Failed to query invoiceRecords for token ID {token_id}: {e}")
            raise

    def has_verifier_role(self, address: str) -> bool:
        try:
            contract = get_invoice_nft_contract()
            role = contract.functions.VERIFIER_ROLE().call()
            return contract.functions.hasRole(role, to_checksum_address(address)).call()
        except Exception as e:
            logger.error(f"Failed to check verifier role for {address}: {e}")
            raise

    def mint_verified_invoice(
        self,
        msme: str,
        buyer: str,
        invoice_hash: bytes,
        invoice_reference: str,
        invoice_amount: int,
        due_date: int,
        token_uri: str
    ) -> Dict[str, Any]:
        contract = get_invoice_nft_contract()
        w3 = blockchain_provider.get_w3()
        signer = blockchain_signer

        # 1. On-chain duplicate check
        if self.is_invoice_hash_used(invoice_hash):
            raise DuplicateInvoiceHashError(f"Invoice hash 0x{invoice_hash.hex()} has already been tokenized on-chain.")

        # 2. Signer validation
        signer.check_verifier_role()

        # Check checksum addresses
        msme_chk = to_checksum_address(msme)
        buyer_chk = to_checksum_address(buyer)

        # 3. Build & Estimate
        try:
            gas_estimate = contract.functions.mintInvoice(
                msme_chk, buyer_chk, invoice_hash, invoice_reference, invoice_amount, due_date, token_uri
            ).estimate_gas({"from": signer.address})
        except Exception as e:
            raise BlockchainTransactionError(f"On-chain dry-run validation/estimation failed: {e}")

        nonce = w3.eth.get_transaction_count(signer.address)

        # 4. Build Tx
        try:
            try:
                base_fee = w3.eth.fee_history(1, "latest")["baseFeePerGas"][-1]
                max_priority_fee = w3.eth.max_priority_fee
                max_fee = base_fee * 2 + max_priority_fee
                tx_data = {
                    "from": signer.address,
                    "nonce": nonce,
                    "gas": int(gas_estimate * 1.25),
                    "maxFeePerGas": max_fee,
                    "maxPriorityFeePerGas": max_priority_fee,
                    "chainId": w3.eth.chain_id
                }
                tx = contract.functions.mintInvoice(
                    msme_chk, buyer_chk, invoice_hash, invoice_reference, invoice_amount, due_date, token_uri
                ).build_transaction(tx_data)
            except Exception:
                # Fallback to legacy
                tx_data = {
                    "from": signer.address,
                    "nonce": nonce,
                    "gas": int(gas_estimate * 1.25),
                    "gasPrice": w3.eth.gas_price,
                    "chainId": w3.eth.chain_id
                }
                tx = contract.functions.mintInvoice(
                    msme_chk, buyer_chk, invoice_hash, invoice_reference, invoice_amount, due_date, token_uri
                ).build_transaction(tx_data)
        except Exception as e:
            raise BlockchainTransactionError(f"Failed to build transaction: {e}")

        # 5. Sign
        try:
            signed_tx = w3.eth.account.sign_transaction(tx, private_key=signer.private_key)
        except Exception as e:
            raise BlockchainTransactionError(f"Failed to sign transaction: {e}")

        # 6. Send
        try:
            raw_tx = getattr(signed_tx, "raw_transaction", getattr(signed_tx, "rawTransaction", None))
            if raw_tx is None:
                raise BlockchainTransactionError("Signed transaction has no raw transaction bytes attribute")
            tx_hash = w3.eth.send_raw_transaction(raw_tx)
        except Exception as e:
            raise BlockchainTransactionError(f"Failed to send transaction: {e}")

        # 7. Wait for receipt
        try:
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
        except Exception as e:
            raise BlockchainReceiptTimeoutError(f"Transaction receipt timeout for {tx_hash.hex()}: {e}")

        if receipt["status"] != 1:
            raise BlockchainTransactionError(f"Transaction failed on-chain (reverted) in block {receipt['blockNumber']}")

        # 8. Parse event
        try:
            logs = contract.events.InvoiceMinted().process_receipt(receipt)
            if not logs:
                raise BlockchainEventParsingError("Failed to parse InvoiceMinted event from receipt logs.")
            event_args = logs[0]["args"]
        except Exception as e:
            raise BlockchainEventParsingError(f"Event logs parsing error: {e}")

        return {
            "success": True,
            "network": blockchain_provider.network,
            "chainId": w3.eth.chain_id,
            "contractAddress": contract.address,
            "transactionHash": tx_hash.hex(),
            "blockNumber": receipt["blockNumber"],
            "tokenId": event_args["tokenId"],
            "invoiceHash": "0x" + event_args["invoiceHash"].hex(),
            "msmeWallet": event_args["msme"],
            "buyerWallet": event_args["buyer"]
        }

blockchain_invoice_service = BlockchainInvoiceService()
