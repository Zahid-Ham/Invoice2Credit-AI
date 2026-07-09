import os
from web3 import Web3

class PolygonService:
    def __init__(self):
        self.rpc_url = os.getenv("POLYGON_AMOY_RPC_URL")
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

# Central Instance
polygon_service = PolygonService()
