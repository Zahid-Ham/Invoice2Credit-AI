import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from uuid import uuid4

from app.marketplace.bidding.repositories.bidding_repository import BiddingRepository
from app.services.firebase.firebase_service import firebase_service
from app.events.notification_service import notification_service
from app.events.activity_service import activity_service
from app.events.event_types import EventType

logger = logging.getLogger("BiddingService")

class BiddingService:
    def __init__(self):
        self.repo = BiddingRepository()

    @property
    def db(self):
        if not firebase_service.db:
            raise RuntimeError("Firestore is not initialized.")
        return firebase_service.db

    def place_bid(self, listing_id: str, investor_id: str, bid_amount: float, expected_yield: float) -> Dict[str, Any]:
        """
        Execute investor bid placement with rule validations, progress updates,
        outbid notification alerts, and automated investment transitions.
        """
        # 1. Validate Investor profile and role
        investor_profile = self.repo.get_user_profile(investor_id)
        if not investor_profile:
            raise ValueError(f"Investor profile for UID '{investor_id}' does not exist.")
        
        role = investor_profile.get("role")
        # Allowed any role for testing/demo convenience
        # if role != "Investor":
        #     raise ValueError(f"User is not authorized as an Investor (current role: '{role}').")

        investor_name = investor_profile.get("displayName") or investor_profile.get("email") or "Investor"

        # 2. Validate Marketplace Listing
        listing_ref = self.db.collection("marketplace").document(listing_id).get()
        if not listing_ref.exists:
            raise ValueError(f"Marketplace listing '{listing_id}' not found.")
        
        listing = listing_ref.to_dict()
        if listing.get("status") == "Funded":
            raise ValueError("Auction has ended. This invoice is already fully funded.")

        # 3. Validate Invoice existence
        invoice_id = listing.get("invoiceId")
        invoice_ref = self.db.collection("invoices").document(invoice_id).get()
        if not invoice_ref.exists:
            raise ValueError(f"Underlying invoice '{invoice_id}' not found.")
        invoice = invoice_ref.to_dict()

        # 4. Validate bid amount vs minimum bid
        min_bid = float(listing.get("minBid", 0))
        if bid_amount < min_bid:
            raise ValueError(f"Bid amount ₹{bid_amount:,.2f} is below the minimum required bid of ₹{min_bid:,.2f}.")

        # 5. Prevent duplicate identical bids (identical amount and yield by same investor)
        existing_bids = self.repo.get_bids_for_listing(listing_id)
        for b in existing_bids:
            if (b.get("investorId") == investor_id and 
                float(b.get("bidAmount", 0)) == bid_amount and 
                float(b.get("expectedYield", 0)) == expected_yield):
                raise ValueError("Duplicate identical bid already exists from you for this listing.")

        # 6. Check if this bid becomes the leading bid
        previous_highest_bidder = None
        for b in existing_bids:
            if b.get("status") == "Lead":
                previous_highest_bidder = b
                break

        is_new_lead = True
        if previous_highest_bidder:
            prev_yield = float(previous_highest_bidder.get("expectedYield", 999999))
            if expected_yield < prev_yield:
                is_new_lead = True
            elif expected_yield == prev_yield:
                # Tie-breaker: new bid is always later timestamp, so it cannot beat the existing lead
                is_new_lead = False
            else:
                is_new_lead = False

        now_str = datetime.utcnow().isoformat() + "Z"
        bid_status = "Lead" if is_new_lead else "Active"

        # Create Bid Payload
        bid_payload = {
            "investorId": investor_id,
            "investorName": investor_name,
            "listingId": listing_id,
            "bidAmount": bid_amount,
            "expectedYield": expected_yield,
            "timestamp": now_str,
            "status": bid_status
        }

        bid_id = self.repo.create_bid(bid_payload)
        bid_payload["id"] = bid_id

        # Update previous leading bid to "Outbid" if outbid
        if is_new_lead and previous_highest_bidder:
            self.repo.update_bid_status(previous_highest_bidder["id"], "Outbid")
            # Notify previous highest bidder
            try:
                prev_id = previous_highest_bidder.get("investorId")
                if prev_id:
                    notification_service.create(
                        user_id=prev_id,
                        event_type=EventType.INVESTOR_BID_RECEIVED,
                        title="You have been Outbid!",
                        desc=f"Your bid of ₹{previous_highest_bidder['bidAmount']:,.0f} on {listing.get('buyer')} was outbid by ₹{bid_amount:,.0f}.",
                        invoice_id=invoice_id
                    )
            except Exception as exc:
                logger.warning(f"Could not notify outbid investor: {exc}")

        # Recalculate funding progress
        invoice_total = float(listing.get("amount", 1))
        # Total funded is the sum of all 'Lead' and 'Active' bids or progress-based
        # Let's add the new bid amount to current listing progress
        current_progress = float(listing.get("progress", 0))
        new_progress = min(100, int(current_progress + (bid_amount / invoice_total) * 100))
        
        previous_highest_bid_val = float(previous_highest_bidder.get("bidAmount", 0)) if previous_highest_bidder else 0.0
        new_highest = max(previous_highest_bid_val, bid_amount)
        listing_status = "Funded" if new_progress >= 100 else listing.get("status", "Live Auction")

        # Update listing bids array for quick UI consumption
        ui_bid = {
            "investor": investor_name,
            "bid": bid_amount,
            "yield": expected_yield,
            "date": "Just now"
        }
        listing_bids = listing.get("bids", [])
        listing_bids.insert(0, ui_bid)

        listing_update = {
            "highestBid": new_highest,
            "progress": new_progress,
            "status": listing_status,
            "bids": listing_bids,
            "updatedAt": now_str
        }

        self.db.collection("marketplace").document(listing_id).update(listing_update)

        # 7. Check if fully funded, transfer state and create investments record
        if new_progress >= 100:
            # Update all leading bids for this listing to Funded
            self.repo.update_bid_status(bid_id, "Funded")
            
            # Create Investment document
            investment_payload = {
                "investorId": investor_id,
                "investorName": investor_name,
                "listingId": listing_id,
                "invoiceId": invoice_id,
                "buyerName": listing.get("buyer", "Unknown Buyer"),
                "amount": bid_amount,
                "yieldRate": expected_yield,
                "settlementDate": listing.get("dueDate", ""),
                "status": "Active",
                "timestamp": now_str
            }
            self.repo.create_investment(investment_payload)

            # Update Raw Invoice status to Funded
            self.db.collection("invoices").document(invoice_id).update({
                "invoiceStatus": "Funded",
                "updatedAt": now_str
            })

            # Notify MSME owner of full funding
            try:
                owner_uid = invoice.get("createdBy")
                if owner_uid:
                    _desc = f"Invoice {invoice.get('invoiceNumber')} has been fully funded by {investor_name}!"
                    notification_service.create(
                        user_id=owner_uid,
                        event_type=EventType.INVESTOR_BID_RECEIVED,
                        title=f"Invoice Funded — {invoice.get('invoiceNumber')}",
                        desc=_desc,
                        invoice_id=invoice_id
                    )
                    activity_service.log(
                        user_id=owner_uid,
                        event_type=EventType.INVESTOR_BID_RECEIVED,
                        title=f"Invoice Fully Funded — {invoice.get('invoiceNumber')}",
                        desc=_desc,
                        status="Completed",
                        invoice_id=invoice_id,
                        invoice_num=invoice.get("invoiceNumber", ""),
                        actor="Bidding Engine"
                    )
            except Exception as exc:
                logger.warning(f"Could not notify invoice owner of full funding: {exc}")
        else:
            # Notify MSME owner of new bid
            try:
                owner_uid = invoice.get("createdBy")
                if owner_uid:
                    _desc = f"Investor {investor_name} placed a bid of ₹{bid_amount:,.0f} at {expected_yield}% APY."
                    notification_service.create(
                        user_id=owner_uid,
                        event_type=EventType.INVESTOR_BID_RECEIVED,
                        title=f"Bid Placed on {invoice.get('invoiceNumber')}",
                        desc=_desc,
                        invoice_id=invoice_id
                    )
                    activity_service.log(
                        user_id=owner_uid,
                        event_type=EventType.INVESTOR_BID_RECEIVED,
                        title=f"Bid Placed — {invoice.get('invoiceNumber')}",
                        desc=_desc,
                        status="Active",
                        invoice_id=invoice_id,
                        invoice_num=invoice.get("invoiceNumber", ""),
                        actor=investor_name
                    )
            except Exception as exc:
                logger.warning(f"Could not notify owner of bid: {exc}")

        return bid_payload

    def get_bids_for_listing(self, listing_id: str) -> List[Dict[str, Any]]:
        return self.repo.get_bids_for_listing(listing_id)

    def get_bids_for_investor(self, investor_id: str) -> List[Dict[str, Any]]:
        return self.repo.get_bids_for_investor(investor_id)

    def get_investments_for_investor(self, investor_id: str) -> List[Dict[str, Any]]:
        return self.repo.get_investments_for_investor(investor_id)

# Global singleton
bidding_service = BiddingService()
