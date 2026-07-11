import logging
from typing import List, Dict, Any, Optional
from app.services.firebase.firebase_service import firebase_service

logger = logging.getLogger("AuctionRepository")

class AuctionRepository:
    @property
    def db(self):
        if not firebase_service.db:
            raise RuntimeError("Firestore is not initialized.")
        return firebase_service.db

    def create_auction(self, auction_id: str, payload: Dict[str, Any]):
        """Save a new auction doc in 'auctions' collection."""
        self.db.collection("auctions").document(auction_id).set(payload)

    def get_auction(self, auction_id: str) -> Optional[Dict[str, Any]]:
        """Get an auction doc by ID."""
        doc = self.db.collection("auctions").document(auction_id).get()
        if doc.exists:
            data = doc.to_dict()
            data["id"] = doc.id
            return data
        return None

    def get_auction_by_invoice(self, invoice_id: str) -> Optional[Dict[str, Any]]:
        """Find an auction by its associated invoice ID."""
        try:
            docs = self.db.collection("auctions").where("invoiceId", "==", invoice_id).stream()
            for doc in docs:
                data = doc.to_dict()
                data["id"] = doc.id
                return data
        except Exception as exc:
            logger.error(f"Error fetching auction by invoice {invoice_id}: {exc}")
        return None

    def update_auction(self, auction_id: str, updates: Dict[str, Any]):
        """Update fields on an auction doc."""
        self.db.collection("auctions").document(auction_id).update(updates)

    def get_invoice(self, invoice_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve invoice details from invoices collection."""
        doc = self.db.collection("invoices").document(invoice_id).get()
        if doc.exists:
            data = doc.to_dict()
            data["id"] = doc.id
            return data
        return None

    def get_bids_for_listing(self, listing_id: str) -> List[Dict[str, Any]]:
        """Fetch all bids for a listing to calculate statistics."""
        try:
            docs = self.db.collection("bids").where("listingId", "==", listing_id).stream()
            results = []
            for doc in docs:
                data = doc.to_dict()
                data["id"] = doc.id
                results.append(data)
            return results
        except Exception as exc:
            logger.error(f"Error fetching bids for listing {listing_id}: {exc}")
            return []
