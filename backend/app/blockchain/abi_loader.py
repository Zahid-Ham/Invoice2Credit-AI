import os
import json
from app.blockchain.exceptions import ABIFileError

class ABILoader:
    def __init__(self):
        self.abi_cache = {}
        self.load_all_abis()

    def load_all_abis(self):
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        project_root = os.path.dirname(backend_dir)
        exports_dir = os.path.join(project_root, "blockchain", "exports")

        for name in ["InvoiceNFT", "InvoiceMarketplace", "InvoiceEscrow"]:
            path = os.path.join(exports_dir, f"{name}.json")
            if not os.path.exists(path):
                raise ABIFileError(f"ABI file not found at: {path}")

            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                abi = data.get("abi")
                if not isinstance(abi, list):
                    raise ABIFileError(f"Corrupt ABI structure in {path}: 'abi' must be a JSON array")
                self.abi_cache[name] = abi
            except Exception as e:
                raise ABIFileError(f"Failed to read/parse ABI file at {path}: {e}")

    def get_abi(self, contract_name: str) -> list:
        abi = self.abi_cache.get(contract_name)
        if not abi:
            raise ABIFileError(f"ABI for contract {contract_name} not loaded")
        return abi

abi_loader = ABILoader()
