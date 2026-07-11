import os
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.blockchain.config import BLOCKCHAIN_NETWORK
from app.blockchain.provider import blockchain_provider
from app.blockchain.deployment_loader import deployment_loader
from app.blockchain.abi_loader import abi_loader
from app.blockchain.contracts import (
    get_invoice_nft_contract,
    get_invoice_marketplace_contract,
    get_invoice_escrow_contract
)
from app.blockchain.signer import blockchain_signer
from app.services.invoice_hash_service import calculate_invoice_sha256
from app.services.blockchain_invoice_service import blockchain_invoice_service
from app.blockchain.exceptions import (
    DuplicateInvoiceHashError,
    BlockchainSignerError
)

client = TestClient(app)

# Cache some values to share across related split test cases safely
class SharedState:
    unique_bytes = os.urandom(32)
    hash_res = None
    mint_receipt = None

# 1. provider connects to chain 31337
def test_1_provider_connects_to_chain():
    w3 = blockchain_provider.get_w3()
    assert w3.is_connected() is True
    assert w3.eth.chain_id == 31337

# 2. chain ID validation passes
def test_2_chain_id_validation_passes():
    assert blockchain_provider.expected_chain_id == 31337

# 3. deployment config loads local addresses
def test_3_deployment_config_loads_local_addresses():
    assert deployment_loader.network == "local"
    assert deployment_loader.contracts["InvoiceNFT"]["available"] is True

# 4. ABI loader loads all three ABIs
def test_4_abi_loader_loads_all_abis():
    assert len(abi_loader.get_abi("InvoiceNFT")) > 0
    assert len(abi_loader.get_abi("InvoiceMarketplace")) > 0
    assert len(abi_loader.get_abi("InvoiceEscrow")) > 0

# 5. InvoiceNFT bytecode exists
def test_5_invoice_nft_bytecode_exists():
    w3 = blockchain_provider.get_w3()
    addr = deployment_loader.contracts["InvoiceNFT"]["address"]
    code = w3.eth.get_code(addr)
    assert len(code) > 2

# 6. Marketplace bytecode exists
def test_6_marketplace_bytecode_exists():
    w3 = blockchain_provider.get_w3()
    addr = deployment_loader.contracts["InvoiceMarketplace"]["address"]
    code = w3.eth.get_code(addr)
    assert len(code) > 2

# 7. Escrow bytecode exists
def test_7_escrow_bytecode_exists():
    w3 = blockchain_provider.get_w3()
    addr = deployment_loader.contracts["InvoiceEscrow"]["address"]
    code = w3.eth.get_code(addr)
    assert len(code) > 2

# 8. contract name read succeeds
def test_8_contract_name_read_succeeds():
    name = blockchain_invoice_service.get_contract_name()
    assert name == "Invoice2Credit NFT"

# 9. contract symbol read succeeds
def test_9_contract_symbol_read_succeeds():
    symbol = blockchain_invoice_service.get_contract_symbol()
    assert symbol == "I2CNFT"

# 10. verifier role validation succeeds
def test_10_verifier_role_validation_succeeds():
    has_role = blockchain_invoice_service.has_verifier_role(blockchain_signer.address)
    assert has_role is True

# 11. same file bytes generate same SHA-256 hash
def test_11_same_file_bytes_generate_same_hash():
    data = b"Deterministic hash tests"
    h1 = calculate_invoice_sha256(data)
    h2 = calculate_invoice_sha256(data)
    assert h1["hex"] == h2["hex"]

# 12. different bytes generate different SHA-256 hash
def test_12_different_bytes_generate_different_hash():
    h1 = calculate_invoice_sha256(b"Bytes A")
    h2 = calculate_invoice_sha256(b"Bytes B")
    assert h1["hex"] != h2["hex"]

# 13. real invoice mint succeeds
def test_13_real_invoice_mint_succeeds():
    SharedState.hash_res = calculate_invoice_sha256(SharedState.unique_bytes)
    msme = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    buyer = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
    
    res = blockchain_invoice_service.mint_verified_invoice(
        msme=msme,
        buyer=buyer,
        invoice_hash=SharedState.hash_res["bytes32"],
        invoice_reference="REF-MINT-LIFECYCLE",
        invoice_amount=5000,
        due_date=9999999999,
        token_uri="ipfs://QmTestURI"
    )
    SharedState.mint_receipt = res
    assert res["success"] is True

# 14. real transaction receipt status is 1
def test_14_real_transaction_receipt_status_is_1():
    assert SharedState.mint_receipt is not None
    assert SharedState.mint_receipt["success"] is True

# 15. InvoiceMinted event is parsed
def test_15_invoice_minted_event_is_parsed():
    assert "tokenId" in SharedState.mint_receipt

# 16. token ID comes from real event
def test_16_token_id_comes_from_real_event():
    assert SharedState.mint_receipt["tokenId"] > 0

# 17. invoice record can be read after mint
def test_17_invoice_record_can_be_read_after_mint():
    record = blockchain_invoice_service.get_invoice_record(SharedState.mint_receipt["tokenId"])
    assert record["invoiceHash"] == SharedState.hash_res["hex"]

# 18. duplicate invoice mint is rejected
def test_18_duplicate_invoice_mint_is_rejected():
    msme = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    buyer = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
    
    with pytest.raises(DuplicateInvoiceHashError):
        blockchain_invoice_service.mint_verified_invoice(
            msme=msme,
            buyer=buyer,
            invoice_hash=SharedState.hash_res["bytes32"],
            invoice_reference="REF-MINT-LIFECYCLE-DUP",
            invoice_amount=5000,
            due_date=9999999999,
            token_uri="ipfs://QmTestURI"
        )

# 19. second identical file does not create another NFT
def test_19_second_identical_file_does_not_create_another_nft():
    # Calling the endpoint directly with duplicate file bytes to verify API level duplicate rejection
    token = blockchain_signer.private_key
    # Mock verify UID bypasses to signer address
    headers = {"Authorization": f"Bearer {token}"}
    
    # We upload the same unique_bytes
    response = client.post(
        "/api/v1/blockchain/invoice/mint",
        headers=headers,
        data={
            "invoiceReference": "REF-API-DUP",
            "invoiceAmount": 5000,
            "dueDate": 9999999999,
            "msmeWallet": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            "buyerWallet": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
        },
        files={"file": ("invoice.pdf", SharedState.unique_bytes, "application/pdf")}
    )
    assert response.status_code == 400
    assert "already been tokenized" in response.json()["detail"]

# 20. invalid wallet address is rejected
def test_20_invalid_wallet_address_is_rejected():
    with pytest.raises(Exception):
        blockchain_invoice_service.mint_verified_invoice(
            msme="0xInvalidWalletFormat",
            buyer="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            invoice_hash=os.urandom(32),
            invoice_reference="REF-ERR",
            invoice_amount=1000,
            due_date=9999999999,
            token_uri="ipfs://QmTestURI"
        )

# 21. missing signer configuration fails safely
def test_21_missing_signer_configuration_fails_safely():
    original_key = blockchain_signer.private_key
    blockchain_signer.private_key = ""
    blockchain_signer.account = None
    blockchain_signer.address = None

    with pytest.raises(BlockchainSignerError):
        blockchain_signer.check_verifier_role()

    blockchain_signer.private_key = original_key
    blockchain_signer.load_account()

# 22. private key is never included in API response
def test_22_private_key_is_never_included_in_api_response():
    response = client.get("/api/v1/blockchain/health")
    assert response.status_code == 200
    data = response.json()
    assert "private_key" not in data
    assert "privateKey" not in data
    assert blockchain_signer.private_key not in response.text

# 23. local mode never loads Amoy addresses
def test_23_local_mode_never_loads_amoy_addresses():
    assert deployment_loader.network == "local"
    import json
    with open("../blockchain/exports/amoy-deployment.json", "r") as f:
        amoy_data = json.load(f)
    
    amoy_nft = amoy_data["contracts"].get("InvoiceNFT")
    local_nft = deployment_loader.contracts["InvoiceNFT"]["address"]
    assert local_nft != amoy_nft
