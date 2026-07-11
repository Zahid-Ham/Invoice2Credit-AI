import logging
from typing import List, Dict, Any, Optional
from app.services.firebase.firebase_service import firebase_service

logger = logging.getLogger("AdminRepository")

class AdminRepository:
    @property
    def db(self):
        if not firebase_service.db:
            raise RuntimeError("Firestore is not initialized.")
        return firebase_service.db

    def get_all_users(self) -> List[Dict[str, Any]]:
        """Fetch all users from users collection."""
        try:
            docs = self.db.collection("users").stream()
            results = []
            for doc in docs:
                data = doc.to_dict()
                data["uid"] = doc.id
                results.append(data)
            return results
        except Exception as exc:
            logger.error(f"Failed to fetch users: {exc}")
            return []

    def get_all_invoices(self) -> List[Dict[str, Any]]:
        """Fetch all raw invoices."""
        try:
            docs = self.db.collection("invoices").stream()
            results = []
            for doc in docs:
                data = doc.to_dict()
                data["id"] = doc.id
                results.append(data)
            return results
        except Exception as exc:
            logger.error(f"Failed to fetch invoices: {exc}")
            return []

    def get_all_listings(self) -> List[Dict[str, Any]]:
        """Fetch all listings from marketplace."""
        try:
            docs = self.db.collection("marketplace").stream()
            results = []
            for doc in docs:
                data = doc.to_dict()
                data["id"] = doc.id
                results.append(data)
            return results
        except Exception as exc:
            logger.error(f"Failed to fetch listings: {exc}")
            return []

    def update_user_profile(self, user_id: str, updates: Dict[str, Any]):
        """Update fields on a user doc."""
        self.db.collection("users").document(user_id).update(updates)

    def update_listing(self, listing_id: str, updates: Dict[str, Any]):
        """Update fields on a marketplace listing doc."""
        self.db.collection("marketplace").document(listing_id).update(updates)
