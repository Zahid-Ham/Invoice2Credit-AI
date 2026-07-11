import logging
from typing import List, Dict, Any, Optional
from app.services.firebase.firebase_service import firebase_service

logger = logging.getLogger("BiddingRepository")

class BiddingRepository:
    @property
    def db(self):
        if not firebase_service.db:
            raise RuntimeError("Firestore is not initialized.")
        return firebase_service.db

    def create_bid(self, bid_data: Dict[str, Any]) -> str:
        """Create a new bid document in the 'bids' collection."""
        ref = self.db.collection("bids").add(bid_data)
        return ref[1].id

    def update_bid_status(self, bid_id: str, status: str):
        """Update status of a bid (e.g., Outbid, Lead)."""
        self.db.collection("bids").document(bid_id).update({"status": status})

    def get_bids_for_listing(self, listing_id: str) -> List[Dict[str, Any]]:
        """Fetch all bids for a specific marketplace listing, sorted by timestamp descending."""
        try:
            docs = self.db.collection("bids").where("listingId", "==", listing_id).stream()
            results = []
            for doc in docs:
                data = doc.to_dict()
                data["id"] = doc.id
                results.append(data)
            # Sort in memory desc by timestamp (ISO format)
            results.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            return results
        except Exception as exc:
            logger.error(f"Failed to fetch bids for listing {listing_id}: {exc}")
            return []

    def get_bids_for_investor(self, investor_id: str) -> List[Dict[str, Any]]:
        """Fetch all bids placed by an investor."""
        try:
            docs = self.db.collection("bids").where("investorId", "==", investor_id).stream()
            results = []
            for doc in docs:
                data = doc.to_dict()
                data["id"] = doc.id
                results.append(data)
            results.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            return results
        except Exception as exc:
            logger.error(f"Failed to fetch bids for investor {investor_id}: {exc}")
            return []

    def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile from users collection."""
        doc = self.db.collection("users").document(user_id).get()
        if doc.exists:
            return doc.to_dict()
        return None

    def create_investment(self, investment_data: Dict[str, Any]) -> str:
        """Create a new investment record."""
        ref = self.db.collection("investments").add(investment_data)
        return ref[1].id

    def get_investments_for_investor(self, investor_id: str) -> List[Dict[str, Any]]:
        """Fetch investments funded by the investor."""
        try:
            docs = self.db.collection("investments").where("investorId", "==", investor_id).stream()
            results = []
            for doc in docs:
                data = doc.to_dict()
                data["id"] = doc.id
                results.append(data)
            results.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            return results
        except Exception as exc:
            logger.error(f"Failed to fetch investments for investor {investor_id}: {exc}")
            return []
