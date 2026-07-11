import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.services.firebase.firebase_service import firebase_service

logger = logging.getLogger("BuyerRepository")

class BuyerRepository:
    @property
    def db(self):
        if not firebase_service.db:
            raise RuntimeError("Firestore is not initialized.")
        return firebase_service.db

    def get_invoices_for_buyer(self, buyer_name: str) -> List[Dict[str, Any]]:
        """
        Fetch all invoices where buyer matches. Searches both buyerName
        and buyerCompany fields to handle varied mappings.
        """
        try:
            # Fetch all and filter in memory to support case insensitivity and fallbacks
            docs = self.db.collection("invoices").stream()
            results = []
            for doc in docs:
                data = doc.to_dict()
                data["id"] = doc.id
                
                # Check for match (case-insensitive string checks)
                inv_buyer = (data.get("buyerName") or data.get("buyerCompany") or "").lower()
                if buyer_name.lower() in inv_buyer:
                    results.append(data)
            return results
        except Exception as exc:
            logger.error(f"Failed to fetch invoices for buyer {buyer_name}: {exc}")
            return []

    def get_invoice(self, invoice_id: str) -> Optional[Dict[str, Any]]:
        """Get raw invoice details."""
        doc = self.db.collection("invoices").document(invoice_id).get()
        if doc.exists:
            data = doc.to_dict()
            data["id"] = doc.id
            return data
        return None

    def update_invoice_status(self, invoice_id: str, status: str, updates: Optional[Dict[str, Any]] = None):
        """Update the raw invoice state."""
        payload = {"invoiceStatus": status}
        if updates:
            payload.update(updates)
        self.db.collection("invoices").document(invoice_id).update(payload)

    def update_marketplace_listing_status(self, invoice_id: str, status: str):
        """Update listing in marketplace if listed."""
        try:
            doc_ref = self.db.collection("marketplace").document(invoice_id)
            if doc_ref.get().exists:
                doc_ref.update({"status": status})
        except Exception as exc:
            logger.warning(f"Could not update marketplace status for invoice {invoice_id}: {exc}")

    def settle_investments_for_invoice(self, invoice_id: str):
        """Transition funded active investments for this invoice to Completed/Settled status."""
        try:
            docs = self.db.collection("investments").where("invoiceId", "==", invoice_id).stream()
            for doc in docs:
                self.db.collection("investments").document(doc.id).update({
                    "status": "Completed",
                    "settledAt": datetime.utcnow().isoformat() + "Z" if 'datetime' in globals() else ""
                })
        except Exception as exc:
            logger.error(f"Failed to settle investments for invoice {invoice_id}: {exc}")
