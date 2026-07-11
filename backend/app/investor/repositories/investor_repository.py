import logging
from typing import List, Dict, Any, Optional
from app.services.firebase.firebase_service import firebase_service

logger = logging.getLogger("InvestorRepository")

class InvestorRepository:
    @property
    def db(self):
        if not firebase_service.db:
            raise RuntimeError("Firestore is not initialized.")
        return firebase_service.db

    def get_investor_profile(self, investor_id: str) -> Optional[Dict[str, Any]]:
        """Get profile parameters from users collection."""
        doc = self.db.collection("users").document(investor_id).get()
        if doc.exists:
            return doc.to_dict()
        return None

    def get_investments_for_investor(self, investor_id: str) -> List[Dict[str, Any]]:
        """Fetch all investments funded by the investor."""
        try:
            docs = self.db.collection("investments").where("investorId", "==", investor_id).stream()
            results = []
            for doc in docs:
                data = doc.to_dict()
                data["id"] = doc.id
                results.append(data)
            return results
        except Exception as exc:
            logger.error(f"Failed to fetch investments for investor {investor_id}: {exc}")
            return []

    def get_bids_for_investor(self, investor_id: str) -> List[Dict[str, Any]]:
        """Fetch all bids committed by the investor."""
        try:
            docs = self.db.collection("bids").where("investorId", "==", investor_id).stream()
            results = []
            for doc in docs:
                data = doc.to_dict()
                data["id"] = doc.id
                results.append(data)
            return results
        except Exception as exc:
            logger.error(f"Failed to fetch bids for investor {investor_id}: {exc}")
            return []

    def get_transactions_from_activities(self, investor_id: str) -> List[Dict[str, Any]]:
        """Synthesize transaction ledger items from the activity log timelines."""
        try:
            docs = self.db.collection("activityLogs").where("userId", "==", investor_id).stream()
            results = []
            for doc in docs:
                data = doc.to_dict()
                data["id"] = doc.id
                results.append(data)
            return results
        except Exception as exc:
            logger.error(f"Failed to fetch transactions for investor {investor_id}: {exc}")
            return []
