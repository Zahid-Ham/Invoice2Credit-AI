from web3 import Web3
from app.blockchain.config import BLOCKCHAIN_NETWORK, LOCAL_BLOCKCHAIN_RPC_URL, POLYGON_AMOY_RPC_URL
from app.blockchain.exceptions import BlockchainConnectionError, ChainMismatchError

class BlockchainProvider:
    def __init__(self):
        self.network = BLOCKCHAIN_NETWORK
        self.rpc_url = LOCAL_BLOCKCHAIN_RPC_URL if self.network == "local" else POLYGON_AMOY_RPC_URL
        self.expected_chain_id = 31337 if self.network == "local" else 80002
        self.w3 = None
        self.connect()

    def connect(self):
        if not self.rpc_url:
            raise BlockchainConnectionError(f"RPC URL not configured for network: {self.network}")

        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        
        if not self.w3.is_connected():
            raise BlockchainConnectionError(f"Failed to connect to RPC endpoint: {self.rpc_url}")

        try:
            actual_chain_id = self.w3.eth.chain_id
        except Exception as e:
            raise BlockchainConnectionError(f"Failed to retrieve Chain ID from RPC: {e}")

        if actual_chain_id != self.expected_chain_id:
            raise ChainMismatchError(
                f"Connected chain ID {actual_chain_id} does not match expected chain ID {self.expected_chain_id}."
            )

    def get_w3(self) -> Web3:
        return self.w3

# Reusable provider instance
blockchain_provider = BlockchainProvider()
