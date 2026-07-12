import logging
from typing import List, Optional, Dict, Any
from google.cloud.firestore_v1.base_query import FieldFilter
from app.services.firebase.firebase_service import firebase_service

logger = logging.getLogger("InvoiceRepository")

class InvoiceRepository:
    def __init__(self):
        # We access the client lazily so it works perfectly post-startup
        pass

    @property
    def db(self):
        if not firebase_service.db:
            raise RuntimeError("Firestore is not initialized. Make sure credentials are configured.")
        return firebase_service.db

    def save(self, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Saves a new invoice metadata to Firestore using invoiceId as document ID.
        """
        invoice_id = invoice_data["invoiceId"]
        doc_ref = self.db.collection("invoices").document(invoice_id)
        doc_ref.set(invoice_data)
        logger.info(f"Successfully stored invoice {invoice_id} in Firestore.")
        return invoice_data

    def get_by_id(self, invoice_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetches an invoice from Firestore by its unique document ID.
        """
        doc_ref = self.db.collection("invoices").document(invoice_id).get()
        if doc_ref.exists:
            return doc_ref.to_dict()
        return None

    def get_by_hash(self, invoice_hash: str) -> Optional[Dict[str, Any]]:
        """
        Fetches an invoice by its SHA256 content hash to verify integrity/prevent duplication.
        """
        query = self.db.collection("invoices").where(filter=FieldFilter("invoiceHash", "==", invoice_hash)).limit(1).get()
        if query:
            return query[0].to_dict()
        return None

    def check_duplicate_by_number_and_seller(self, invoice_number: str, seller_gst: str) -> bool:
        """
        Checks if an invoice with the same invoiceNumber and sellerGST already exists.
        """
        query = self.db.collection("invoices") \
            .where(filter=FieldFilter("invoiceNumber", "==", invoice_number)) \
            .where(filter=FieldFilter("sellerGST", "==", seller_gst)) \
            .limit(1).get()
        return len(query) > 0

    def list_all(self, creator_id: Optional[str] = None, status: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Lists invoices with optional filters for createdBy and invoiceStatus.
        """
        query_ref = self.db.collection("invoices")
        if creator_id:
            query_ref = query_ref.where(filter=FieldFilter("createdBy", "==", creator_id))
        if status:
            query_ref = query_ref.where(filter=FieldFilter("invoiceStatus", "==", status))
            
        try:
            docs = query_ref.order_by("createdAt", direction="DESCENDING").limit(limit).get()
        except Exception as e:
            logger.warning(f"Failed to query with order_by (index might be missing): {e}. Fetching and sorting in-memory.")
            # Fallback query without sorting (which doesn't require composite indexes)
            docs = query_ref.limit(limit).get()
            # Sort manually in-memory
            docs = sorted(docs, key=lambda d: d.to_dict().get("createdAt", ""), reverse=True)

        return [doc.to_dict() for doc in docs]

    def update(self, invoice_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Updates fields of an existing invoice in Firestore.
        """
        doc_ref = self.db.collection("invoices").document(invoice_id)
        if not doc_ref.get().exists:
            return None
        doc_ref.update(update_data)
        logger.info(f"Updated invoice {invoice_id} successfully.")
        return doc_ref.get().to_dict()

    def delete(self, invoice_id: str) -> bool:
        """
        Deletes an invoice from Firestore.
        """
        doc_ref = self.db.collection("invoices").document(invoice_id)
        if not doc_ref.get().exists:
            return False
        doc_ref.delete()
        logger.info(f"Deleted invoice {invoice_id} from Firestore.")
        return True

    def get_by_token_id(self, chain_id: int, token_id: int) -> Optional[Dict[str, Any]]:
        """
        Resolves a single invoice by its on-chain NFT tokenId and chainId.
        Supports both string and integer representations in Firestore.
        """
        query = self.db.collection("invoices")\
            .where(filter=FieldFilter("tokenId", "==", str(token_id)))\
            .where(filter=FieldFilter("chainId", "==", chain_id)).get()
        if not query:
            query = self.db.collection("invoices")\
                .where(filter=FieldFilter("tokenId", "==", int(token_id)))\
                .where(filter=FieldFilter("chainId", "==", chain_id)).get()
        if len(query) > 1:
            raise ValueError(f"Data integrity error: Multiple invoices claim tokenId {token_id} on chain {chain_id}")
        if query:
            return query[0].to_dict()
        return None

    def get_by_auction_id(self, chain_id: int, auction_id: int) -> Optional[Dict[str, Any]]:
        """
        Resolves a single invoice by its on-chain auctionId and chainId.
        Supports both string and integer representations in Firestore.
        """
        query = self.db.collection("invoices")\
            .where(filter=FieldFilter("auctionId", "==", str(auction_id)))\
            .where(filter=FieldFilter("chainId", "==", chain_id)).get()
        if not query:
            query = self.db.collection("invoices")\
                .where(filter=FieldFilter("auctionId", "==", int(auction_id)))\
                .where(filter=FieldFilter("chainId", "==", chain_id)).get()
        if len(query) > 1:
            raise ValueError(f"Data integrity error: Multiple invoices claim auctionId {auction_id} on chain {chain_id}")
        if query:
            return query[0].to_dict()
        return None

    def get_by_deal_id(self, chain_id: int, deal_id: int) -> Optional[Dict[str, Any]]:
        """
        Resolves a single invoice by its on-chain dealId and chainId.
        Supports both string and integer representations in Firestore.
        """
        query = self.db.collection("invoices")\
            .where(filter=FieldFilter("dealId", "==", str(deal_id)))\
            .where(filter=FieldFilter("chainId", "==", chain_id)).get()
        if not query:
            query = self.db.collection("invoices")\
                .where(filter=FieldFilter("dealId", "==", int(deal_id)))\
                .where(filter=FieldFilter("chainId", "==", chain_id)).get()
        if len(query) > 1:
            raise ValueError(f"Data integrity error: Multiple invoices claim dealId {deal_id} on chain {chain_id}")
        if query:
            return query[0].to_dict()
        return None

invoice_repository = InvoiceRepository()
