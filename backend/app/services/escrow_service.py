import logging
from typing import Dict, Any

from app.blockchain.contracts import get_invoice_escrow_contract
from app.blockchain.transaction_builder import build_unsigned_transaction
from app.blockchain.exceptions import (
    EscrowDealNotFoundError,
    EscrowInvalidStateError,
    EscrowUnauthorizedCallerError,
    InsufficientFundingValueError
)

logger = logging.getLogger("EscrowService")

STATUS_MAP = {
    0: "CREATED",
    1: "FUNDED",
    2: "MSME_RELEASED",
    3: "SETTLED"
}

class EscrowService:
    def get_next_deal_id(self) -> int:
        return get_invoice_escrow_contract().functions.nextDealId().call()

    def get_deal(self, deal_id: int) -> Dict[str, Any]:
        contract = get_invoice_escrow_contract()
        next_id = contract.functions.nextDealId().call()
        if deal_id >= next_id or deal_id <= 0:
            raise EscrowDealNotFoundError(f"Escrow deal with ID {deal_id} does not exist.")

        data = contract.functions.deals(deal_id).call()
        # Struct: dealId, invoiceTokenId, msme, investor, buyer, fundingAmount, settlementAmount, fundedAt, dueDate, status (enum)
        status_val = data[9]
        return {
            "dealId": data[0],
            "invoiceTokenId": data[1],
            "msme": data[2],
            "investor": data[3],
            "buyer": data[4],
            "fundingAmount": data[5],
            "settlementAmount": data[6],
            "fundedAt": data[7],
            "dueDate": data[8],
            "status": status_val,
            "statusName": STATUS_MAP.get(status_val, "UNKNOWN")
        }

    def prepare_fund_deal(self, deal_id: int, investor_address: str) -> Dict[str, Any]:
        contract = get_invoice_escrow_contract()
        deal = self.get_deal(deal_id)
        
        # Preconditions check
        if deal["status"] != 0: # Status.CREATED
            raise EscrowInvalidStateError(f"Deal {deal_id} is not in CREATED status (current: {deal['statusName']}).")
        if investor_address.lower() != deal["investor"].lower():
            raise EscrowUnauthorizedCallerError("Caller is not the assigned investor for this deal.")

        func = contract.functions.fundDeal(deal_id)
        tx = build_unsigned_transaction(
            from_address=investor_address,
            to_address=contract.address,
            contract_function=func,
            value_wei=deal["fundingAmount"]
        )
        return tx

    def prepare_release_funding(self, deal_id: int, caller_address: str) -> Dict[str, Any]:
        contract = get_invoice_escrow_contract()
        deal = self.get_deal(deal_id)
        
        if deal["status"] != 1: # Status.FUNDED
            raise EscrowInvalidStateError(f"Deal {deal_id} is not in FUNDED status (current: {deal['statusName']}).")

        func = contract.functions.releaseFundingToMSME(deal_id)
        tx = build_unsigned_transaction(
            from_address=caller_address,
            to_address=contract.address,
            contract_function=func
        )
        return tx

    def prepare_settle_invoice(self, deal_id: int, buyer_address: str) -> Dict[str, Any]:
        contract = get_invoice_escrow_contract()
        deal = self.get_deal(deal_id)
        
        if deal["status"] != 2: # Status.MSME_RELEASED
            raise EscrowInvalidStateError(f"Deal {deal_id} is not in MSME_RELEASED status (current: {deal['statusName']}).")
        if buyer_address.lower() != deal["buyer"].lower():
            raise EscrowUnauthorizedCallerError("Caller is not the designated corporate buyer for this deal.")

        func = contract.functions.settleInvoice(deal_id)
        tx = build_unsigned_transaction(
            from_address=buyer_address,
            to_address=contract.address,
            contract_function=func,
            value_wei=deal["settlementAmount"]
        )
        return tx

escrow_service = EscrowService()
