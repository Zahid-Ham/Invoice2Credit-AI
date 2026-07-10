import logging
from datetime import datetime
from typing import Dict, Any, Optional

from app.services.firebase.firebase_service import firebase_service
from app.invoice.repositories.invoice_repository import InvoiceRepository

logger = logging.getLogger("ListingService")

class ListingService:
    def __init__(self):
        self.invoice_repo = InvoiceRepository()

    @property
    def db(self):
        if not firebase_service.db:
            raise RuntimeError("Firestore is not initialized.")
        return firebase_service.db

    def list_invoice_on_marketplace(self, invoice_id: str) -> Dict[str, Any]:
        """
        Validates verification + underwriting compliance, creates a marketplace listing
        document, updates invoice status to LISTED, and stores owner notification alerts.
        """
        # 1. Fetch Invoice
        invoice_doc = self.invoice_repo.get_by_id(invoice_id)
        if not invoice_doc:
            raise ValueError(f"Invoice {invoice_id} not found in database.")

        # 2. Check if invoice is already listed
        if invoice_doc.get("invoiceStatus") == "Listed":
            raise ValueError(f"Invoice {invoice_id} has already been listed on the marketplace.")

        # 3. Verify verification report exists and is Approved/Eligible
        verification_ref = self.db.collection("verificationReports").document(invoice_id).get()
        if not verification_ref.exists:
            raise ValueError(f"Verification report for invoice {invoice_id} is missing. Run compliance validation first.")
        
        ver_data = verification_ref.to_dict()
        if not ver_data.get("eligibleForMarketplace") or ver_data.get("overallStatus") == "Rejected":
            raise ValueError(f"Invoice {invoice_id} is ineligible for listing. Status is {ver_data.get('overallStatus')}.")

        # 4. Verify AI credit report exists
        ai_ref = self.db.collection("invoiceReports").document(invoice_id).get()
        if not ai_ref.exists:
            raise ValueError(f"AI Underwriting credit report for invoice {invoice_id} is missing.")
        
        ai_data = ai_ref.to_dict()

        # 5. Build marketplace listing format matching UI schema
        listing_id = f"LST-{Date_Now_Int()}"
        now_str = datetime.utcnow().isoformat() + "Z"
        
        # Determine industry (fallback to 'Manufacturing' or general)
        industry = invoice_doc.get("industry") or "Manufacturing"
        
        listing_data = {
            "id": invoice_doc.get("invoiceNumber", invoice_id),
            "invoiceId": invoice_id,
            "listingId": listing_id,
            "buyer": invoice_doc.get("buyerName", "Unknown Buyer"),
            "owner": invoice_doc.get("sellerName", "Unknown Seller"),
            "industry": industry,
            "amount": invoice_doc.get("invoiceAmount", 0.0),
            "required": invoice_doc.get("invoiceAmount", 0.0),
            "progress": 0,
            "grade": ai_data.get("creditGrade", "B"),
            "yieldRate": ai_data.get("expectedInvestorYield", 12.0),
            "dueDate": invoice_doc.get("dueDate", ""),
            "confidence": float(ai_data.get("confidenceScore", 0.85) * 100),
            "status": "Live Auction",
            "tokenUrl": invoice_doc.get("invoiceHash", "0x..."),
            "minBid": float(invoice_doc.get("invoiceAmount", 0.0) * 0.75),
            "highestBid": 0.0,
            "timeRemaining": "3d 12h",
            "bids": [],
            "createdAt": now_str,
            "updatedAt": now_str,
            "investorVisibility": True
        }

        # 6. Save Listing to marketplace collection
        # We use invoiceId as document ID in marketplace to guarantee 1-to-1 mapping
        self.db.collection("marketplace").document(invoice_id).set(listing_data)
        logger.info(f"Created marketplace listing {listing_id} for invoice {invoice_id}")

        # 7. Update raw invoice status
        try:
            self.invoice_repo.update(invoice_id, {
                "invoiceStatus": "Listed",
                "updatedAt": now_str
            })
        except Exception as exc:
            logger.error(f"Could not update status of invoice {invoice_id} to Listed: {exc}")

        # 8. Notify Owner (create notification document)
        try:
            owner_uid = invoice_doc.get("createdBy")
            if owner_uid:
                notification = {
                    "userId": owner_uid,
                    "title": "Invoice Listed",
                    "message": f"Your invoice {invoice_doc.get('invoiceNumber')} has been approved and listed on the Marketplace.",
                    "read": False,
                    "timestamp": now_str
                }
                self.db.collection("notifications").add(notification)
                logger.info(f"Created owner listing alert for user {owner_uid}")
        except Exception as exc:
            logger.error(f"Failed to create owner notification: {exc}")

        return listing_data

    def get_all_listings(self) -> list:
        """Return all documents from the Firestore marketplace collection."""
        try:
            docs = self.db.collection("marketplace").stream()
            result = []
            for doc in docs:
                data = doc.to_dict()
                data["docId"] = doc.id
                result.append(data)
            return result
        except Exception as exc:
            logger.error(f"Failed to fetch marketplace listings: {exc}")
            return []

    def get_listing_by_id(self, invoice_id: str) -> Optional[Dict[str, Any]]:
        """Return a single listing document by invoice ID."""
        try:
            doc_ref = self.db.collection("marketplace").document(invoice_id).get()
            if doc_ref.exists:
                data = doc_ref.to_dict()
                data["docId"] = doc_ref.id
                return data
        except Exception as exc:
            logger.error(f"Failed to fetch listing {invoice_id}: {exc}")
        return None

    def place_bid(self, invoice_id: str, bid_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Appends a bid to an existing listing's bids array and updates progress.
        """
        listing = self.get_listing_by_id(invoice_id)
        if not listing:
            raise ValueError(f"Listing for invoice {invoice_id} not found.")

        bid_amount = float(bid_data.get("bid", 0))
        total_amount = float(listing.get("amount", 1))
        current_progress = float(listing.get("progress", 0))
        current_highest = float(listing.get("highestBid", 0))

        # Append the new bid
        existing_bids = listing.get("bids", [])
        existing_bids.insert(0, bid_data)

        # Recalculate progress
        new_progress = min(100, int(current_progress + (bid_amount / total_amount) * 100))
        new_highest = max(current_highest, bid_amount)
        new_status = "Funded" if new_progress >= 100 else listing.get("status", "Live Auction")
        now_str = datetime.utcnow().isoformat() + "Z"

        update_payload = {
            "bids": existing_bids,
            "highestBid": new_highest,
            "progress": new_progress,
            "status": new_status,
            "updatedAt": now_str
        }

        self.db.collection("marketplace").document(invoice_id).update(update_payload)
        listing.update(update_payload)
        return listing


def Date_Now_Int() -> int:
    return int(datetime.utcnow().timestamp())

# Global singleton
listing_service = ListingService()
