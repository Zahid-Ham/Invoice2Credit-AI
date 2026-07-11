from web3.contract import Contract
from app.blockchain.provider import blockchain_provider
from app.blockchain.deployment_loader import deployment_loader
from app.blockchain.abi_loader import abi_loader
from app.blockchain.exceptions import ContractUnavailableError

def get_contract(name: str) -> Contract:
    contract_info = deployment_loader.contracts.get(name)
    if not contract_info or not contract_info["available"]:
        raise ContractUnavailableError(f"Contract {name} is not available on the active network: {deployment_loader.network}")

    w3 = blockchain_provider.get_w3()
    address = contract_info["address"]
    abi = abi_loader.get_abi(name)

    return w3.eth.contract(address=address, abi=abi)

def get_invoice_nft_contract() -> Contract:
    return get_contract("InvoiceNFT")

def get_invoice_marketplace_contract() -> Contract:
    return get_contract("InvoiceMarketplace")

def get_invoice_escrow_contract() -> Contract:
    return get_contract("InvoiceEscrow")
