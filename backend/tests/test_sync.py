import os
import time
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.blockchain.provider import blockchain_provider
from app.blockchain.contracts import (
    get_invoice_nft_contract,
    get_invoice_marketplace_contract,
    get_invoice_escrow_contract
)
from app.blockchain.signer import blockchain_signer
from app.services.invoice_hash_service import calculate_invoice_sha256
from app.services.blockchain_invoice_service import blockchain_invoice_service
from app.invoice.repositories.invoice_repository import invoice_repository
from app.services.blockchain_sync_service import blockchain_sync_service

client = TestClient(app)

MSME_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
MSME_ADDR = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"

INVESTOR_KEY = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
INVESTOR_ADDR = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"

BUYER_KEY = "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
BUYER_ADDR = "0x90F79bf6EB2c4f870365E785982E1f101E93b906"

def sign_and_submit_tx(w3, prepared_tx, private_key):
    signed = w3.eth.account.sign_transaction(prepared_tx, private_key=private_key)
    raw = getattr(signed, "raw_transaction", getattr(signed, "rawTransaction", None))
    tx_hash = w3.eth.send_raw_transaction(raw)
    return w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

def to_hex_str(val):
    if isinstance(val, str):
        if not val.startswith("0x"):
            return "0x" + val
        return val
    hex_val = val.hex()
    if not hex_val.startswith("0x"):
        return "0x" + hex_val
    return hex_val

def advance_hardhat_time(w3, seconds: int):
    w3.provider.make_request("evm_increaseTime", [seconds])
    w3.provider.make_request("evm_mine", [])

class TestBlockchainSync:
    @pytest.fixture(autouse=True)
    def setup_class(self):
        from app.services.firebase.firebase_service import firebase_service
        if os.path.exists("mock_db.json"):
            try:
                os.remove("mock_db.json")
            except Exception:
                pass
        firebase_service.initialize()
        self.w3 = blockchain_provider.get_w3()
        self.nft = get_invoice_nft_contract()
        self.mkt = get_invoice_marketplace_contract()
        self.esc = get_invoice_escrow_contract()

    def test_repository_resolution_and_integrity_checks(self):
        invoice_id = "test-inv-sync-" + os.urandom(4).hex()
        inv_data = {
            "invoiceId": invoice_id,
            "invoiceNumber": "INV-SYNC-1",
            "invoiceHash": "0xhashsync1",
            "invoiceAmount": 500000,
            "invoiceStatus": "Pending",
            "createdBy": "msme-uid",
            "sellerGST": "GST-1",
            "chainId": 31337,
            "tokenId": 9999,
            "auctionId": 8888,
            "dealId": 7777
        }
        invoice_repository.save(inv_data)

        # Test resolution
        resolved = invoice_repository.get_by_token_id(31337, 9999)
        assert resolved["invoiceId"] == invoice_id

        resolved_auc = invoice_repository.get_by_auction_id(31337, 8888)
        assert resolved_auc["invoiceId"] == invoice_id

        resolved_deal = invoice_repository.get_by_deal_id(31337, 7777)
        assert resolved_deal["invoiceId"] == invoice_id

        # Clean up
        invoice_repository.delete(invoice_id)

    def test_same_token_id_across_networks(self):
        inv_a_id = "inv-a-" + os.urandom(4).hex()
        inv_b_id = "inv-b-" + os.urandom(4).hex()
        
        invoice_repository.save({
            "invoiceId": inv_a_id,
            "invoiceNumber": "INV-A",
            "chainId": 31337,
            "tokenId": 999991,
            "invoiceStatus": "Pending"
        })
        invoice_repository.save({
            "invoiceId": inv_b_id,
            "invoiceNumber": "INV-B",
            "chainId": 80002,
            "tokenId": 999991,
            "invoiceStatus": "Pending"
        })

        res_a = invoice_repository.get_by_token_id(31337, 999991)
        res_b = invoice_repository.get_by_token_id(80002, 999991)
        print("RES A:", res_a)
        print("RES B:", res_b)
        assert res_a["invoiceId"] == inv_a_id
        assert invoice_repository.get_by_token_id(80002, 999991)["invoiceId"] == inv_b_id

        invoice_repository.delete(inv_a_id)
        invoice_repository.delete(inv_b_id)

    def test_duplicate_token_id_same_network(self):
        inv_a_id = "inv-a-" + os.urandom(4).hex()
        inv_b_id = "inv-b-" + os.urandom(4).hex()

        invoice_repository.save({
            "invoiceId": inv_a_id,
            "chainId": 80002,
            "tokenId": 999992
        })
        invoice_repository.save({
            "invoiceId": inv_b_id,
            "chainId": 80002,
            "tokenId": 999992
        })

        with pytest.raises(ValueError) as excinfo:
            invoice_repository.get_by_token_id(80002, 999992)
        assert "Multiple invoices claim tokenId 999992 on chain 80002" in str(excinfo.value)

        invoice_repository.delete(inv_a_id)
        invoice_repository.delete(inv_b_id)

    def test_same_auction_id_across_networks(self):
        inv_a_id = "inv-a-" + os.urandom(4).hex()
        inv_b_id = "inv-b-" + os.urandom(4).hex()

        invoice_repository.save({
            "invoiceId": inv_a_id,
            "chainId": 31337,
            "auctionId": 888881
        })
        invoice_repository.save({
            "invoiceId": inv_b_id,
            "chainId": 80002,
            "auctionId": 888881
        })

        assert invoice_repository.get_by_auction_id(31337, 888881)["invoiceId"] == inv_a_id
        assert invoice_repository.get_by_auction_id(80002, 888881)["invoiceId"] == inv_b_id

        invoice_repository.delete(inv_a_id)
        invoice_repository.delete(inv_b_id)

    def test_duplicate_auction_id_same_network(self):
        inv_a_id = "inv-a-" + os.urandom(4).hex()
        inv_b_id = "inv-b-" + os.urandom(4).hex()

        invoice_repository.save({
            "invoiceId": inv_a_id,
            "chainId": 80002,
            "auctionId": 888882
        })
        invoice_repository.save({
            "invoiceId": inv_b_id,
            "chainId": 80002,
            "auctionId": 888882
        })

        with pytest.raises(ValueError) as excinfo:
            invoice_repository.get_by_auction_id(80002, 888882)
        assert "Multiple invoices claim auctionId 888882 on chain 80002" in str(excinfo.value)

        invoice_repository.delete(inv_a_id)
        invoice_repository.delete(inv_b_id)

    def test_same_deal_id_across_networks(self):
        inv_a_id = "inv-a-" + os.urandom(4).hex()
        inv_b_id = "inv-b-" + os.urandom(4).hex()

        invoice_repository.save({
            "invoiceId": inv_a_id,
            "chainId": 31337,
            "dealId": 777771
        })
        invoice_repository.save({
            "invoiceId": inv_b_id,
            "chainId": 80002,
            "dealId": 777771
        })

        assert invoice_repository.get_by_deal_id(31337, 777771)["invoiceId"] == inv_a_id
        assert invoice_repository.get_by_deal_id(80002, 777771)["invoiceId"] == inv_b_id

        invoice_repository.delete(inv_a_id)
        invoice_repository.delete(inv_b_id)

    def test_duplicate_deal_id_same_network(self):
        inv_a_id = "inv-a-" + os.urandom(4).hex()
        inv_b_id = "inv-b-" + os.urandom(4).hex()

        invoice_repository.save({
            "invoiceId": inv_a_id,
            "chainId": 80002,
            "dealId": 777772
        })
        invoice_repository.save({
            "invoiceId": inv_b_id,
            "chainId": 80002,
            "dealId": 777772
        })

        with pytest.raises(ValueError) as excinfo:
            invoice_repository.get_by_deal_id(80002, 777772)
        assert "Multiple invoices claim dealId 777772 on chain 80002" in str(excinfo.value)

        invoice_repository.delete(inv_a_id)
        invoice_repository.delete(inv_b_id)

    def test_uint256_precision_serialization(self):
        inv_id = "test-uint256-" + os.urandom(4).hex()
        large_uint256 = 2**256 - 1
        invoice_repository.save({
            "invoiceId": inv_id,
            "tokenId": large_uint256,
            "fundingAmount": large_uint256,
            "settlementAmount": large_uint256
        })

        resolved = invoice_repository.get_by_id(inv_id)
        assert int(resolved["tokenId"]) == large_uint256
        assert int(resolved["fundingAmount"]) == large_uint256
        assert int(resolved["settlementAmount"]) == large_uint256

        invoice_repository.delete(inv_id)

    def test_e2e_synchronization_lifecycle(self):
        # 1. Create a Firestore invoice
        invoice_id = "e2e-sync-" + os.urandom(4).hex()
        unique_bytes = os.urandom(32)
        hash_res = calculate_invoice_sha256(unique_bytes)
        due_date = int(time.time()) + 100000

        inv_data = {
            "invoiceId": invoice_id,
            "invoiceNumber": "INV-E2E-SYNC",
            "invoiceHash": hash_res["hex"],
            "invoiceAmount": 1000000,
            "dueDate": due_date,
            "invoiceStatus": "Pending",
            "createdBy": "msme-uid",
            "sellerGST": "GST-E2E-SYNC"
        }
        invoice_repository.save(inv_data)

        # 2. Mint NFT on-chain
        mint_receipt = blockchain_invoice_service.mint_verified_invoice(
            msme=MSME_ADDR,
            buyer=BUYER_ADDR,
            invoice_hash=hash_res["bytes32"],
            invoice_reference="REF-E2E-SYNC",
            invoice_amount=1000000,
            due_date=due_date,
            token_uri="ipfs://QmMetadataSync"
        )
        tx_hash = to_hex_str(mint_receipt["transactionHash"])
        assert mint_receipt["success"] is True

        # 3. Synchronize mint transaction
        sync_res = client.post(f"/api/v1/blockchain/transactions/{tx_hash}/sync")
        print("SYNC RES:", sync_res.status_code, sync_res.json())
        assert sync_res.status_code == 200
        assert sync_res.json()["eventsProcessed"] == ["InvoiceMinted"]

        # Assert database updated
        inv = invoice_repository.get_by_id(invoice_id)
        assert inv["tokenId"] is not None
        assert inv["blockchainStatus"] == "MINTED"
        token_id = int(inv["tokenId"])

        # 4. Create Auction
        app_tx = self.nft.functions.approve(self.mkt.address, token_id).build_transaction({
            "from": MSME_ADDR,
            "nonce": self.w3.eth.get_transaction_count(MSME_ADDR),
            "gas": 100000,
            "gasPrice": self.w3.eth.gas_price
        })
        sign_and_submit_tx(self.w3, app_tx, MSME_KEY)

        headers = {"Authorization": f"Bearer {blockchain_signer.private_key}"}
        prepare_lst_res = client.post(
            "/api/v1/marketplace/auctions/prepare-create",
            headers=headers,
            json={
                "tokenId": token_id,
                "minimumFundingAmount": 800000,
                "duration": 3600,
                "sellerAddress": MSME_ADDR
            }
        )
        assert prepare_lst_res.status_code == 200
        lst_tx_data = prepare_lst_res.json()["transaction"]
        lst_receipt = sign_and_submit_tx(self.w3, {
            "to": lst_tx_data["to"],
            "data": lst_tx_data["data"],
            "value": int(lst_tx_data["value"], 16),
            "nonce": self.w3.eth.get_transaction_count(MSME_ADDR),
            "gas": int(lst_tx_data["gas"], 16),
            "gasPrice": self.w3.eth.gas_price
        }, MSME_KEY)
        assert lst_receipt["status"] == 1

        # Synchronize auction creation
        sync_auc_res = client.post(f"/api/v1/blockchain/transactions/{to_hex_str(lst_receipt['transactionHash'])}/sync")
        assert sync_auc_res.status_code == 200
        assert "AuctionCreated" in sync_auc_res.json()["eventsProcessed"]

        inv = invoice_repository.get_by_id(invoice_id)
        assert inv["auctionId"] is not None
        assert inv["invoiceStatus"] == "Auction Live"
        auction_id = int(inv["auctionId"])

        # 5. Place bid
        prepare_bid_res = client.post(
            "/api/v1/marketplace/auctions/prepare-bid",
            headers=headers,
            json={
                "auctionId": auction_id,
                "fundingAmount": 900000,
                "discountRate": 500, # 5.00%
                "bidderAddress": INVESTOR_ADDR
            }
        )
        assert prepare_bid_res.status_code == 200
        bid_tx_data = prepare_bid_res.json()["transaction"]
        bid_receipt = sign_and_submit_tx(self.w3, {
            "to": bid_tx_data["to"],
            "data": bid_tx_data["data"],
            "value": int(bid_tx_data["value"], 16),
            "nonce": self.w3.eth.get_transaction_count(INVESTOR_ADDR),
            "gas": int(bid_tx_data["gas"], 16),
            "gasPrice": self.w3.eth.gas_price
        }, INVESTOR_KEY)
        assert bid_receipt["status"] == 1

        # Synchronize bid placement
        sync_bid_res = client.post(f"/api/v1/blockchain/transactions/{to_hex_str(bid_receipt['transactionHash'])}/sync")
        assert sync_bid_res.status_code == 200

        # Cleanup
        invoice_repository.delete(invoice_id)

    def test_admin_metrics_calculation(self):
        # Create a set of invoices with distinct currencies and statuses
        inv_a = "metric-inv-a-" + os.urandom(4).hex()
        inv_b = "metric-inv-b-" + os.urandom(4).hex()
        
        invoice_repository.save({
            "invoiceId": inv_a,
            "invoiceAmount": 100000.0,
            "invoiceStatus": "Auction Live",
            "escrowStatus": "",
            "chainId": 31337
        })
        invoice_repository.save({
            "invoiceId": inv_b,
            "invoiceAmount": 200000.0,
            "invoiceStatus": "Funded",
            "escrowStatus": "FUNDED",
            "fundingAmount": str(150000 * 10**18), # 150,000 POL in Wei
            "chainId": 31337
        })

        from app.admin.services.admin_service import admin_service
        data = admin_service.get_dashboard_data()

        assert data["totalInvoiceFaceValue"] >= 300000.0
        assert data["totalOnChainFunding"] >= 150000.0
        assert data["activeFinancingRequestsCount"] >= 1
        assert data["financingDisbursedCount"] >= 0

        # Clean up
        invoice_repository.delete(inv_a)
        invoice_repository.delete(inv_b)
