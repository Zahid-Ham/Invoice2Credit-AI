import os
import json
from eth_utils import is_address
from app.blockchain.config import BLOCKCHAIN_NETWORK
from app.blockchain.exceptions import DeploymentConfigError

class DeploymentLoader:
    def __init__(self):
        self.network = BLOCKCHAIN_NETWORK
        self.config_data = {}
        self.contracts = {}
        self.load_config()

    def load_config(self):
        # Resolve project root path safely
        # File is at: backend/app/blockchain/deployment_loader.py
        # backend_dir is at: backend/
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        project_root = os.path.dirname(backend_dir)
        
        filename = "local-deployment.json" if self.network == "local" else "amoy-deployment.json"
        manifest_path = os.path.join(project_root, "blockchain", "exports", filename)

        if not os.path.exists(manifest_path):
            raise DeploymentConfigError(f"Deployment manifest not found at: {manifest_path}")

        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                self.config_data = json.load(f)
        except Exception as e:
            raise DeploymentConfigError(f"Failed to read/parse deployment manifest at {manifest_path}: {e}")

        expected_chain_id = 31337 if self.network == "local" else 80002
        actual_chain_id = self.config_data.get("chainId")
        if actual_chain_id != expected_chain_id:
            raise DeploymentConfigError(
                f"Chain ID mismatch in manifest. Expected: {expected_chain_id}, Got: {actual_chain_id}"
            )

        contracts_section = self.config_data.get("contracts", {})
        
        for name in ["InvoiceNFT", "InvoiceMarketplace", "InvoiceEscrow"]:
            addr = contracts_section.get(name)
            if addr:
                if not is_address(addr):
                    raise DeploymentConfigError(f"Invalid Ethereum address format for contract {name}: {addr}")
                self.contracts[name] = {
                    "available": True,
                    "address": addr
                }
            else:
                self.contracts[name] = {
                    "available": False,
                    "address": None
                }

        if self.network == "local":
            missing = [k for k, v in self.contracts.items() if not v["available"]]
            if missing:
                raise DeploymentConfigError(f"Missing required contract deployments for local network: {missing}")

deployment_loader = DeploymentLoader()
