import os
import logging
from web3 import Web3
from eth_abi.packed import encode_packed

logger = logging.getLogger("PolygonService")

class PolygonService:
    def __init__(self):
        self.rpc_url = os.getenv("POLYGON_AMOY_RPC_URL")
        self.nft_contract_address = os.getenv("NFT_CONTRACT_ADDRESS")
        self.w3 = None
        if self.rpc_url:
            self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
            
    def is_connected(self) -> bool:
        if not self.w3:
            return False
        return self.w3.is_connected()
        
    def get_latest_block(self) -> int:
        if not self.is_connected():
            return 0
        return self.w3.eth.block_number

    def compute_invoice_hash(self, irn: str, buyer_gstin: str, amount: float, due_date: str) -> bytes:
        """
        Computes keccak256(abi.encodePacked(IRN, buyerGSTIN, amount, dueDate))
        """
        amount_int = int(amount)
        encoded = encode_packed(
            ['string', 'string', 'uint256', 'string'],
            [irn, buyer_gstin, amount_int, due_date]
        )
        return Web3.keccak(encoded)

    def check_duplicate_hash_onchain(self, invoice_hash: bytes):
        """
        Returns the existing Token ID if registered, or None if not registered.
        Handles missing contract gracefully for development.
        """
        if not self.is_connected() or not self.nft_contract_address:
            logger.warning("Web3 not connected or NFT_CONTRACT_ADDRESS missing. Skipping on-chain duplicate check.")
            return None
            
        try:
            abi = [
                {
                    "inputs": [{"internalType": "bytes32", "name": "invoiceHash", "type": "bytes32"}],
                    "name": "isHashRegistered",
                    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
                    "name": "hashToTokenId",
                    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                    "stateMutability": "view",
                    "type": "function"
                }
            ]
            contract = self.w3.eth.contract(address=self.nft_contract_address, abi=abi)
            
            is_registered = contract.functions.isHashRegistered(invoice_hash).call()
            if is_registered:
                token_id = contract.functions.hashToTokenId(invoice_hash).call()
                return token_id
            return None
            
        except Exception as e:
            logger.error(f"Failed to check duplicate hash on-chain: {e}")
            return None

# Central Instance
polygon_service = PolygonService()
