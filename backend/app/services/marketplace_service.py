import logging
from typing import Dict, Any, List

from app.blockchain.contracts import get_invoice_marketplace_contract
from app.blockchain.transaction_builder import build_unsigned_transaction
from app.blockchain.exceptions import (
    MarketplaceListingNotFoundError,
    MarketplaceListingInactiveError,
    MarketplaceUnauthorizedCallerError,
    MarketplaceInvalidBidError
)

logger = logging.getLogger("MarketplaceService")

class MarketplaceService:
    def get_next_auction_id(self) -> int:
        return get_invoice_marketplace_contract().functions.nextAuctionId().call()

    def get_active_auction_for_token(self, token_id: int) -> int:
        return get_invoice_marketplace_contract().functions.activeAuctionForToken(token_id).call()

    def get_auction(self, auction_id: int) -> Dict[str, Any]:
        contract = get_invoice_marketplace_contract()
        next_id = contract.functions.nextAuctionId().call()
        if auction_id >= next_id or auction_id <= 0:
            raise MarketplaceListingNotFoundError(f"Auction with ID {auction_id} does not exist.")

        data = contract.functions.auctions(auction_id).call()
        # Struct: auctionId, tokenId, seller, minimumFundingAmount, startTime, endTime, active, settled
        return {
            "auctionId": data[0],
            "tokenId": data[1],
            "seller": data[2],
            "minimumFundingAmount": data[3],
            "startTime": data[4],
            "endTime": data[5],
            "active": data[6],
            "settled": data[7]
        }

    def get_bids(self, auction_id: int) -> List[Dict[str, Any]]:
        contract = get_invoice_marketplace_contract()
        # Verify existence
        self.get_auction(auction_id)
        
        raw_bids = contract.functions.getBids(auction_id).call()
        # Array of Bid struct: bidder, fundingAmount, discountRate, timestamp
        return [
            {
                "bidder": b[0],
                "fundingAmount": b[1],
                "discountRate": b[2],
                "timestamp": b[3]
            }
            for b in raw_bids
        ]

    def prepare_create_auction(self, token_id: int, minimum_funding_amount: int, duration: int, seller_address: str) -> Dict[str, Any]:
        contract = get_invoice_marketplace_contract()
        # Contract-level validations in Python before build
        # 1. token active auctions checks
        active_id = self.get_active_auction_for_token(token_id)
        if active_id != 0:
            raise MarketplaceListingInactiveError(f"Token {token_id} already has an active auction ID {active_id}.")

        func = contract.functions.createAuction(token_id, minimum_funding_amount, duration)
        tx = build_unsigned_transaction(
            from_address=seller_address,
            to_address=contract.address,
            contract_function=func
        )
        return tx

    def prepare_place_bid(self, auction_id: int, funding_amount: int, discount_rate: int, bidder_address: str) -> Dict[str, Any]:
        contract = get_invoice_marketplace_contract()
        # Preconditions check
        auction = self.get_auction(auction_id)
        if not auction["active"]:
            raise MarketplaceListingInactiveError(f"Auction {auction_id} is not active.")
        if auction["settled"]:
            raise MarketplaceListingInactiveError(f"Auction {auction_id} is already settled.")
        if bidder_address.lower() == auction["seller"].lower():
            raise MarketplaceUnauthorizedCallerError("Seller cannot bid on their own auction.")
        if funding_amount < auction["minimumFundingAmount"]:
            raise MarketplaceInvalidBidError(f"Bid amount {funding_amount} is below minimum funding requirement {auction['minimumFundingAmount']}.")
        if discount_rate <= 0 or discount_rate > contract.functions.MAX_DISCOUNT_RATE().call():
            raise MarketplaceInvalidBidError("Invalid discount rate basis points value.")

        func = contract.functions.placeBid(auction_id, funding_amount, discount_rate)
        tx = build_unsigned_transaction(
            from_address=bidder_address,
            to_address=contract.address,
            contract_function=func
        )
        return tx

    def prepare_close_auction(self, auction_id: int, caller_address: str) -> Dict[str, Any]:
        contract = get_invoice_marketplace_contract()
        auction = self.get_auction(auction_id)
        if not auction["active"]:
            raise MarketplaceListingInactiveError(f"Auction {auction_id} is not active.")
        if auction["settled"]:
            raise MarketplaceListingInactiveError(f"Auction {auction_id} is already settled.")

        func = contract.functions.closeAuction(auction_id)
        tx = build_unsigned_transaction(
            from_address=caller_address,
            to_address=contract.address,
            contract_function=func
        )
        return tx

marketplace_service = MarketplaceService()
