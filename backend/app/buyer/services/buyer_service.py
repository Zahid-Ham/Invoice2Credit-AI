import logging
from datetime import datetime, timezone
from typing import Dict, Any, List

from app.buyer.repositories.buyer_repository import BuyerRepository
from app.events.notification_service import notification_service
from app.events.activity_service import activity_service
from app.events.event_types import EventType

logger = logging.getLogger("BuyerService")

class BuyerService:
    def __init__(self):
        self.repo = BuyerRepository()

    def get_dashboard_data(self, buyer_name: str) -> Dict[str, Any]:
        """
        Compiles outstanding balances, pending confirmation count,
        total approved invoices, and settled volumes.
        """
        invoices = self.repo.get_invoices_for_buyer(buyer_name)
        
        total_outstanding = 0.0
        pending_approvals = 0
        total_approved = 0.0
        total_repaid = 0.0

        for inv in invoices:
            status = inv.get("invoiceStatus", "Pending Approval")
            amount = float(inv.get("invoiceAmount", 0.0))

            if status in ["Pending Approval", "Verification"]:
                pending_approvals += 1
            elif status == "Approved" or status == "Listed" or status == "Funded":
                total_outstanding += amount
                total_approved += amount
            elif status == "Settled" or status == "Closed" or status == "Paid":
                total_repaid += amount

        return {
            "totalOutstanding": total_outstanding,
            "pendingApprovalsCount": pending_approvals,
            "totalApproved": total_approved,
            "totalRepaid": total_repaid
        }

    def get_invoices(self, buyer_name: str) -> List[Dict[str, Any]]:
        """Returns all invoice logs associated with the buyer."""
        invoices = self.repo.get_invoices_for_buyer(buyer_name)
        items = []
        for inv in invoices:
            items.append({
                "id": inv.get("id"),
                "invoiceNumber": inv.get("invoiceNumber", "INV-UNKNOWN"),
                "sellerName": inv.get("sellerName", "Unknown Seller"),
                "buyerName": inv.get("buyerName", "Unknown Buyer"),
                "amount": float(inv.get("invoiceAmount", 0.0)),
                "status": inv.get("invoiceStatus", "Pending Approval"),
                "dueDate": inv.get("dueDate") or "",
                "createdAt": inv.get("createdAt") or ""
            })
        return items

    def approve_invoice(self, invoice_id: str) -> Dict[str, Any]:
        """
        Approve an invoice, updating state and notifying MSME.
        """
        invoice = self.repo.get_invoice(invoice_id)
        if not invoice:
            raise ValueError(f"Invoice '{invoice_id}' not found.")

        now_str = datetime.utcnow().isoformat() + "Z"
        self.repo.update_invoice_status(invoice_id, "Approved", {"updatedAt": now_str})

        # Notify MSME
        owner_uid = invoice.get("createdBy")
        inv_num = invoice.get("invoiceNumber", invoice_id)
        if owner_uid:
            _desc = f"Buyer {invoice.get('buyerName')} approved invoice {inv_num}."
            try:
                notification_service.create(
                    user_id=owner_uid,
                    event_type=EventType.COMPLIANCE_PASSED, # Or buyer approved event
                    title="Invoice Approved by Buyer",
                    desc=_desc,
                    invoice_id=invoice_id
                )
                activity_service.log(
                    user_id=owner_uid,
                    event_type=EventType.COMPLIANCE_PASSED,
                    title=f"Buyer Approved Invoice — {inv_num}",
                    desc=_desc,
                    status="Completed",
                    invoice_id=invoice_id,
                    invoice_num=inv_num,
                    actor=invoice.get('buyerName')
                )
            except Exception as exc:
                logger.warning(f"Failed to write approval notifications: {exc}")

        return {"success": True, "invoiceId": invoice_id, "status": "Approved"}

    def reject_invoice(self, invoice_id: str) -> Dict[str, Any]:
        """
        Reject an invoice.
        """
        invoice = self.repo.get_invoice(invoice_id)
        if not invoice:
            raise ValueError(f"Invoice '{invoice_id}' not found.")

        now_str = datetime.utcnow().isoformat() + "Z"
        self.repo.update_invoice_status(invoice_id, "Rejected", {"updatedAt": now_str})

        # Notify MSME
        owner_uid = invoice.get("createdBy")
        inv_num = invoice.get("invoiceNumber", invoice_id)
        if owner_uid:
            _desc = f"Buyer {invoice.get('buyerName')} rejected invoice {inv_num}."
            try:
                notification_service.create(
                    user_id=owner_uid,
                    event_type=EventType.COMPLIANCE_FAILED,
                    title="Invoice Rejected by Buyer",
                    desc=_desc,
                    invoice_id=invoice_id
                )
                activity_service.log(
                    user_id=owner_uid,
                    event_type=EventType.COMPLIANCE_FAILED,
                    title=f"Buyer Rejected Invoice — {inv_num}",
                    desc=_desc,
                    status="Failed",
                    invoice_id=invoice_id,
                    invoice_num=inv_num,
                    actor=invoice.get('buyerName')
                )
            except Exception as exc:
                logger.warning(f"Failed to write rejection notifications: {exc}")

        return {"success": True, "invoiceId": invoice_id, "status": "Rejected"}

    def settle_payment(self, invoice_id: str) -> Dict[str, Any]:
        """
        Releases payment, closing marketplace listing, raw invoice, and active investments.
        """
        invoice = self.repo.get_invoice(invoice_id)
        if not invoice:
            raise ValueError(f"Invoice '{invoice_id}' not found.")

        now_str = datetime.utcnow().isoformat() + "Z"
        
        # 1. Update Raw Invoice to Settled
        self.repo.update_invoice_status(invoice_id, "Settled", {"updatedAt": now_str})
        
        # 2. Update Marketplace status
        self.repo.update_marketplace_listing_status(invoice_id, "Closed")

        # 3. Complete associated investments
        try:
            db = self.repo.db
            docs = db.collection("investments").where("invoiceId", "==", invoice_id).stream()
            for doc in docs:
                db.collection("investments").document(doc.id).update({
                    "status": "Completed",
                    "settledAt": now_str
                })
                # Notify Investor
                investor_uid = doc.to_dict().get("investorId")
                if investor_uid:
                    notification_service.create(
                        user_id=investor_uid,
                        event_type=EventType.INVESTOR_BID_RECEIVED,
                        title="Repayment Settlement Received",
                        desc=f"Funds for invoice {invoice.get('invoiceNumber')} have been repaid by the Buyer. Your earnings have been credited to your wallet.",
                        invoice_id=invoice_id
                    )
        except Exception as exc:
            logger.error(f"Settle payment loop failed: {exc}")

        # Notify Seller (MSME)
        owner_uid = invoice.get("createdBy")
        inv_num = invoice.get("invoiceNumber", invoice_id)
        if owner_uid:
            _desc = f"Buyer settled payment for invoice {inv_num}. Platform escrow released."
            try:
                notification_service.create(
                    user_id=owner_uid,
                    event_type=EventType.INVESTOR_BID_RECEIVED,
                    title=f"Invoice Repaid — {inv_num}",
                    desc=_desc,
                    invoice_id=invoice_id
                )
                activity_service.log(
                    user_id=owner_uid,
                    event_type=EventType.INVESTOR_BID_RECEIVED,
                    title=f"Repayment Settled — {inv_num}",
                    desc=_desc,
                    status="Completed",
                    invoice_id=invoice_id,
                    invoice_num=inv_num,
                    actor=invoice.get('buyerName')
                )
            except Exception as exc:
                logger.warning(f"Failed to log settlement notifications: {exc}")

        return {"success": True, "invoiceId": invoice_id, "status": "Settled"}

# Global singleton
buyer_service = BuyerService()
