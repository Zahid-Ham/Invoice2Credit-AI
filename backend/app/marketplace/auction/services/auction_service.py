import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from uuid import uuid4

from app.marketplace.auction.repositories.auction_repository import AuctionRepository
from app.services.firebase.firebase_service import firebase_service
from app.events.notification_service import notification_service
from app.events.activity_service import activity_service
from app.events.event_types import EventType

logger = logging.getLogger("AuctionService")

class AuctionService:
    def __init__(self):
        self.repo = AuctionRepository()

    @property
    def db(self):
        if not firebase_service.db:
            raise RuntimeError("Firestore is not initialized.")
        return firebase_service.db

    def start_auction(self, invoice_id: str, duration_hours: int = 24) -> Dict[str, Any]:
        """
        Transitions an invoice listing state to Live Auction, creating the auction
        document, initializing countdown, and logging events.
        """
        # 1. Fetch Invoice
        invoice = self.repo.get_invoice(invoice_id)
        if not invoice:
            raise ValueError(f"Invoice '{invoice_id}' not found.")
        
        # 2. Check if auction already exists
        existing = self.repo.get_auction_by_invoice(invoice_id)
        if existing:
            if existing.get("status") == "Live":
                return existing
            raise ValueError(f"Auction for invoice {invoice_id} is already in state: {existing.get('status')}.")

        now = datetime.now(timezone.utc)
        end_time = now + timedelta(hours=duration_hours)
        now_str = now.isoformat().replace("+00:00", "Z")
        end_str = end_time.isoformat().replace("+00:00", "Z")
        
        auction_id = f"AUC-{int(now.timestamp())}"
        amount = float(invoice.get("invoiceAmount", 0.0))

        auction_data = {
            "invoiceId": invoice_id,
            "status": "Live",
            "startTime": now_str,
            "endTime": end_str,
            "fundingProgress": 0.0,
            "investorCount": 0,
            "amount": amount,
            "highestBid": 0.0,
            "winningBid": None,
            "createdAt": now_str,
            "updatedAt": now_str
        }

        # 3. Write to Firestore
        self.repo.create_auction(auction_id, auction_data)
        auction_data["id"] = auction_id

        # 4. Synchronize Marketplace status to Live Auction
        self.db.collection("marketplace").document(invoice_id).update({
            "status": "Live Auction",
            "timeRemaining": f"{duration_hours}h remaining",
            "updatedAt": now_str
        })

        # 5. Update raw invoice status
        self.db.collection("invoices").document(invoice_id).update({
            "invoiceStatus": "Listed",
            "updatedAt": now_str
        })

        # 6. Dispatch Notifications & Logs
        owner_uid = invoice.get("createdBy")
        inv_num = invoice.get("invoiceNumber", invoice_id)
        if owner_uid:
            _desc = f"Auction starts now for invoice {inv_num}. Total amount: ₹{amount:,.0f}."
            try:
                notification_service.create(
                    user_id=owner_uid,
                    event_type=EventType.LISTED_ON_MARKETPLACE,
                    title=f"Auction Started — {inv_num}",
                    desc=_desc,
                    invoice_id=invoice_id
                )
                activity_service.log(
                    user_id=owner_uid,
                    event_type=EventType.LISTED_ON_MARKETPLACE,
                    title=f"Auction Launched — {inv_num}",
                    desc=_desc,
                    status="Active",
                    invoice_id=invoice_id,
                    invoice_num=inv_num,
                    actor="Auction Manager"
                )
            except Exception as exc:
                logger.warning(f"Could not emit auction start notification: {exc}")

        return auction_data

    def close_auction(self, auction_id: str) -> Dict[str, Any]:
        """
        Closes an active auction, identifies winning bids, creates investments, and settles states.
        """
        auction = self.repo.get_auction(auction_id)
        if not auction:
            raise ValueError(f"Auction '{auction_id}' not found.")
        
        if auction.get("status") in ["Closed", "Cancelled"]:
            return auction

        invoice_id = auction.get("invoiceId")
        invoice = self.repo.get_invoice(invoice_id)
        
        # Pull all bids for this auction listing
        bids = self.repo.get_bids_for_listing(invoice_id)
        
        # Sort bids descending to identify highest
        bids.sort(key=lambda b: float(b.get("bidAmount", 0)), reverse=True)
        
        leading_bid = None
        for b in bids:
            if b.get("status") in ["Lead", "Active", "Funded"]:
                leading_bid = b
                break

        now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        
        # Determine status update: Fully Funded if progress >= 100 else Closed
        current_progress = float(auction.get("fundingProgress", 0.0))
        final_status = "Closed"
        
        winning_bid_val = None
        if leading_bid:
            winning_bid_val = float(leading_bid.get("bidAmount", 0))
            # Mark winning bid as Funded
            self.db.collection("bids").document(leading_bid["id"]).update({
                "status": "Funded",
                "updatedAt": now_str
            })
            
            # Create finalized investment record for winning investor
            investment_payload = {
                "investorId": leading_bid.get("investorId"),
                "investorName": leading_bid.get("investorName"),
                "listingId": invoice_id,
                "invoiceId": invoice_id,
                "buyerName": invoice.get("buyerName", "Unknown Buyer") if invoice else "Unknown Buyer",
                "amount": winning_bid_val,
                "yieldRate": float(leading_bid.get("expectedYield", 12.0)),
                "settlementDate": invoice.get("dueDate", "") if invoice else "",
                "status": "Active",
                "timestamp": now_str
            }
            self.db.collection("investments").add(investment_payload)

        # Update Auction Status
        updates = {
            "status": final_status,
            "winningBid": winning_bid_val,
            "updatedAt": now_str
        }
        self.repo.update_auction(auction_id, updates)
        auction.update(updates)

        # Update raw invoice
        self.db.collection("invoices").document(invoice_id).update({
            "invoiceStatus": final_status,
            "updatedAt": now_str
        })

        # Update marketplace listing
        self.db.collection("marketplace").document(invoice_id).update({
            "status": final_status,
            "updatedAt": now_str
        })

        # Notifications
        if invoice:
            owner_uid = invoice.get("createdBy")
            inv_num = invoice.get("invoiceNumber", invoice_id)
            if owner_uid:
                _desc = f"Auction {auction_id} for invoice {inv_num} is now closed. Winner: {leading_bid.get('investorName') if leading_bid else 'None'}."
                try:
                    notification_service.create(
                        user_id=owner_uid,
                        event_type=EventType.INVESTOR_BID_RECEIVED,
                        title=f"Auction Closed — {inv_num}",
                        desc=_desc,
                        invoice_id=invoice_id
                    )
                    activity_service.log(
                        user_id=owner_uid,
                        event_type=EventType.INVESTOR_BID_RECEIVED,
                        title=f"Auction Settle — {inv_num}",
                        desc=_desc,
                        status="Completed",
                        invoice_id=invoice_id,
                        invoice_num=inv_num,
                        actor="Auction Manager"
                    )
                except Exception as exc:
                    logger.warning(f"Could not notify of auction close: {exc}")

        return auction

    def get_auction_analytics(self, auction_id: str) -> Dict[str, Any]:
        """
        Computes dynamic dashboard/marketplace metrics including funding percentages,
        unique investor counts, and countdown metrics.
        """
        auction = self.repo.get_auction(auction_id)
        if not auction:
            raise ValueError(f"Auction '{auction_id}' not found.")

        invoice_id = auction.get("invoiceId")
        bids = self.repo.get_bids_for_listing(invoice_id)
        
        # Calculate unique investor count
        unique_investors = set(b.get("investorId") for b in bids if b.get("investorId"))
        investor_count = len(unique_investors)

        # Calculate funding progress
        goal_amount = float(auction.get("amount", 1.0))
        total_bid_sum = sum(float(b.get("bidAmount", 0.0)) for b in bids if b.get("status") != "Outbid")
        progress = min(100.0, round((total_bid_sum / goal_amount) * 100.0, 2))

        # Calculate time remaining
        time_rem = "Expired"
        try:
            end_ts = datetime.fromisoformat(auction.get("endTime").rstrip("Z")).replace(tzinfo=timezone.utc)
            now_ts = datetime.now(timezone.utc)
            delta = end_ts - now_ts
            if delta.total_seconds() > 0:
                hours = int(delta.total_seconds() // 3600)
                minutes = int((delta.total_seconds() % 3600) // 60)
                time_rem = f"{hours}h {minutes}m remaining"
        except Exception:
            pass

        # Find highest bid
        highest_bid = max([float(b.get("bidAmount", 0.0)) for b in bids] + [0.0])

        analytics_update = {
            "fundingProgress": progress,
            "investorCount": investor_count,
            "highestBid": highest_bid,
            "timeRemaining": time_rem,
            "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        }

        self.repo.update_auction(auction_id, analytics_update)
        auction.update(analytics_update)
        return auction

# Global singleton
auction_service = AuctionService()
