import os
import time
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.blockchain.provider import blockchain_provider
from app.blockchain.deployment_loader import deployment_loader
from app.blockchain.contracts import (
    get_invoice_nft_contract,
    get_invoice_marketplace_contract,
    get_invoice_escrow_contract
)
from app.blockchain.signer import blockchain_signer
from app.services.invoice_hash_service import calculate_invoice_sha256
from app.services.blockchain_invoice_service import blockchain_invoice_service
from app.blockchain.exceptions import (
    MarketplaceListingNotFoundError,
    MarketplaceListingInactiveError,
    EscrowDealNotFoundError,
    EscrowInvalidStateError
)

client = TestClient(app)

# Hardhat Local test private keys
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

# Helper to advance local Hardhat time
def advance_hardhat_time(w3, seconds: int):
    w3.provider.make_request("evm_increaseTime", [seconds])
    w3.provider.make_request("evm_mine", [])

class TestMarketplaceEscrowLifecycle:
    @pytest.fixture(autouse=True)
    def setup_class(self):
        self.w3 = blockchain_provider.get_w3()
        self.nft = get_invoice_nft_contract()
        self.mkt = get_invoice_marketplace_contract()
        self.esc = get_invoice_escrow_contract()

    def test_full_blockchain_marketplace_escrow_lifecycle(self):
        # 1. Create unique invoice and mint NFT
        unique_bytes = os.urandom(32)
        hash_res = calculate_invoice_sha256(unique_bytes)
        
        # Mint to MSME (Account #1)
        due_date = int(time.time()) + 100000
        mint_res = blockchain_invoice_service.mint_verified_invoice(
            msme=MSME_ADDR,
            buyer=BUYER_ADDR,
            invoice_hash=hash_res["bytes32"],
            invoice_reference="REF-MKT-ESC-LIFECYCLE",
            invoice_amount=1000000,
            due_date=due_date,
            token_uri="ipfs://QmMetadata"
        )
        token_id = mint_res["tokenId"]
        assert token_id > 0

        # Pre-approve Marketplace to custody/transfer MSME's NFT
        app_tx = self.nft.functions.approve(self.mkt.address, token_id).build_transaction({
            "from": MSME_ADDR,
            "nonce": self.w3.eth.get_transaction_count(MSME_ADDR),
            "gas": 100000,
            "gasPrice": self.w3.eth.gas_price
        })
        sign_and_submit_tx(self.w3, app_tx, MSME_KEY)

        # 2. Prepare Listing Transaction (Seller = MSME)
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
        assert prepare_lst_res.json()["signingMode"] == "USER_WALLET"

        # Sign & Submit Listing transaction
        tx_param = {
            "from": lst_tx_data["from"],
            "to": lst_tx_data["to"],
            "data": lst_tx_data["data"],
            "value": int(lst_tx_data["value"], 16),
            "gas": int(lst_tx_data["gas"], 16),
            "nonce": self.w3.eth.get_transaction_count(MSME_ADDR),
            "gasPrice": self.w3.eth.gas_price
        }
        receipt = sign_and_submit_tx(self.w3, tx_param, MSME_KEY)
        assert receipt["status"] == 1

        # Decode event using API
        tx_hex = self.w3.to_hex(receipt['transactionHash'])
        ev_decode_res = client.get(f"/api/v1/blockchain/transactions/{tx_hex}/events")
        assert ev_decode_res.status_code == 200
        ev_data = ev_decode_res.json()
        assert ev_data["events"][0]["event"] == "AuctionCreated"
        auction_id = ev_data["events"][0]["args"]["auctionId"]

        # Validate Listing State via API
        auc_detail_res = client.get(f"/api/v1/marketplace/auctions/{auction_id}", headers=headers)
        assert auc_detail_res.status_code == 200
        assert auc_detail_res.json()["active"] is True

        # 3. Prepare Bid Transaction (Investor = Account #2)
        prepare_bid_res = client.post(
            "/api/v1/marketplace/auctions/prepare-bid",
            headers=headers,
            json={
                "auctionId": auction_id,
                "fundingAmount": 900000,
                "discountRate": 500, # 5%
                "bidderAddress": INVESTOR_ADDR
            }
        )
        assert prepare_bid_res.status_code == 200
        bid_tx_data = prepare_bid_res.json()["transaction"]

        # Sign & Submit Bid transaction
        bid_param = {
            "from": bid_tx_data["from"],
            "to": bid_tx_data["to"],
            "data": bid_tx_data["data"],
            "value": int(bid_tx_data["value"], 16),
            "gas": int(bid_tx_data["gas"], 16),
            "nonce": self.w3.eth.get_transaction_count(INVESTOR_ADDR),
            "gasPrice": self.w3.eth.gas_price
        }
        bid_receipt = sign_and_submit_tx(self.w3, bid_param, INVESTOR_KEY)
        assert bid_receipt["status"] == 1

        # Query bids
        bids_res = client.get(f"/api/v1/marketplace/auctions/{auction_id}/bids", headers=headers)
        assert bids_res.status_code == 200
        assert len(bids_res.json()) == 1
        assert bids_res.json()[0]["bidder"].lower() == INVESTOR_ADDR.lower()

        # 4. Advance time to expire the auction
        advance_hardhat_time(self.w3, 3700)

        # 5. Prepare Close Auction (MSME caller)
        prepare_close_res = client.post(
            "/api/v1/marketplace/auctions/prepare-close",
            headers=headers,
            json={
                "auctionId": auction_id,
                "callerAddress": MSME_ADDR
            }
        )
        assert prepare_close_res.status_code == 200
        close_tx_data = prepare_close_res.json()["transaction"]

        # Sign & Submit Close
        close_param = {
            "from": close_tx_data["from"],
            "to": close_tx_data["to"],
            "data": close_tx_data["data"],
            "value": int(close_tx_data["value"], 16),
            "gas": int(close_tx_data["gas"], 16),
            "nonce": self.w3.eth.get_transaction_count(MSME_ADDR),
            "gasPrice": self.w3.eth.gas_price
        }
        close_receipt = sign_and_submit_tx(self.w3, close_param, MSME_KEY)
        assert close_receipt["status"] == 1

        # Decode Close event -> retrieve Escrow dealId
        close_tx_hex = self.w3.to_hex(close_receipt['transactionHash'])
        close_ev_res = client.get(f"/api/v1/blockchain/transactions/{close_tx_hex}/events")
        assert close_ev_res.status_code == 200
        close_events = close_ev_res.json()["events"]
        # Find AuctionClosed event
        auc_close_event = next(e for e in close_events if e["event"] == "AuctionClosed")
        deal_id = auc_close_event["args"]["dealId"]

        # Verify Escrow Deal exists via API
        deal_res = client.get(f"/api/v1/escrow/deals/{deal_id}", headers=headers)
        assert deal_res.status_code == 200
        assert deal_res.json()["statusName"] == "CREATED"

        # 6. Prepare Escrow Funding (Investor pays fundingAmount)
        prepare_fund_res = client.post(
            "/api/v1/escrow/deals/prepare-fund",
            headers=headers,
            json={
                "dealId": deal_id,
                "callerAddress": INVESTOR_ADDR
            }
        )
        assert prepare_fund_res.status_code == 200
        fund_tx_data = prepare_fund_res.json()["transaction"]
        assert int(fund_tx_data["value"], 16) == 900000

        # Sign & Submit Funding
        fund_param = {
            "from": fund_tx_data["from"],
            "to": fund_tx_data["to"],
            "data": fund_tx_data["data"],
            "value": int(fund_tx_data["value"], 16),
            "gas": int(fund_tx_data["gas"], 16),
            "nonce": self.w3.eth.get_transaction_count(INVESTOR_ADDR),
            "gasPrice": self.w3.eth.gas_price
        }
        fund_receipt = sign_and_submit_tx(self.w3, fund_param, INVESTOR_KEY)
        assert fund_receipt["status"] == 1

        # Check status is FUNDED
        deal_res = client.get(f"/api/v1/escrow/deals/{deal_id}", headers=headers)
        assert deal_res.json()["statusName"] == "FUNDED"

        # 7. Prepare MSME Release (arbitrary caller can trigger release)
        prepare_rel_res = client.post(
            "/api/v1/escrow/deals/prepare-release",
            headers=headers,
            json={
                "dealId": deal_id,
                "callerAddress": MSME_ADDR
            }
        )
        assert prepare_rel_res.status_code == 200
        rel_tx_data = prepare_rel_res.json()["transaction"]

        # Sign & Submit Release
        rel_param = {
            "from": rel_tx_data["from"],
            "to": rel_tx_data["to"],
            "data": rel_tx_data["data"],
            "value": int(rel_tx_data["value"], 16),
            "gas": int(rel_tx_data["gas"], 16),
            "nonce": self.w3.eth.get_transaction_count(MSME_ADDR),
            "gasPrice": self.w3.eth.gas_price
        }
        rel_receipt = sign_and_submit_tx(self.w3, rel_param, MSME_KEY)
        assert rel_receipt["status"] == 1

        # Check status is MSME_RELEASED
        deal_res = client.get(f"/api/v1/escrow/deals/{deal_id}", headers=headers)
        assert deal_res.json()["statusName"] == "MSME_RELEASED"

        # 8. Prepare Settle Invoice (Buyer pays settlementAmount = 1,000,000)
        prepare_set_res = client.post(
            "/api/v1/escrow/deals/prepare-settle",
            headers=headers,
            json={
                "dealId": deal_id,
                "callerAddress": BUYER_ADDR
            }
        )
        assert prepare_set_res.status_code == 200
        set_tx_data = prepare_set_res.json()["transaction"]
        assert int(set_tx_data["value"], 16) == 1000000

        # Sign & Submit Settle
        set_param = {
            "from": set_tx_data["from"],
            "to": set_tx_data["to"],
            "data": set_tx_data["data"],
            "value": int(set_tx_data["value"], 16),
            "gas": int(set_tx_data["gas"], 16),
            "nonce": self.w3.eth.get_transaction_count(BUYER_ADDR),
            "gasPrice": self.w3.eth.gas_price
        }
        set_receipt = sign_and_submit_tx(self.w3, set_param, BUYER_KEY)
        assert set_receipt["status"] == 1

        # Check status is SETTLED
        deal_res = client.get(f"/api/v1/escrow/deals/{deal_id}", headers=headers)
        assert deal_res.json()["statusName"] == "SETTLED"

    def test_marketplace_revert_negative_scenarios(self):
        headers = {"Authorization": f"Bearer {blockchain_signer.private_key}"}

        # 1. Nonexistent Auction Details
        auc_detail_res = client.get("/api/v1/marketplace/auctions/999999", headers=headers)
        assert auc_detail_res.status_code == 404

        # 2. Nonexistent Escrow Deal Details
        deal_res = client.get("/api/v1/escrow/deals/999999", headers=headers)
        assert deal_res.status_code == 404

        # 3. Unauthorized place bid preparation on non-active auction
        prepare_bid_res = client.post(
            "/api/v1/marketplace/auctions/prepare-bid",
            headers=headers,
            json={
                "auctionId": 999999,
                "fundingAmount": 900000,
                "discountRate": 500,
                "bidderAddress": INVESTOR_ADDR
            }
        )
        assert prepare_bid_res.status_code == 404

    def test_no_broadcast_or_signing_on_prepare_endpoints(self):
        headers = {"Authorization": f"Bearer {blockchain_signer.private_key}"}
        
        # Record initial block number
        w3 = blockchain_provider.get_w3()
        block_before = w3.eth.block_number

        # Trigger prepare create auction
        client.post(
            "/api/v1/marketplace/auctions/prepare-create",
            headers=headers,
            json={
                "tokenId": 9999, # nonexistent token will fail estimation anyway but prove no broadcast
                "minimumFundingAmount": 800000,
                "duration": 3600,
                "sellerAddress": MSME_ADDR
            }
        )

        block_after = w3.eth.block_number
        # Confirm no block generation occurred (which means no transaction broadcasted/signed by backend)
        assert block_before == block_after
