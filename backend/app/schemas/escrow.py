from pydantic import BaseModel, field_validator
from eth_utils import is_address

class PrepareEscrowActionRequest(BaseModel):
    dealId: int
    callerAddress: str

    @field_validator("callerAddress")
    def validate_caller_address(cls, v):
        if not is_address(v):
            raise ValueError("Invalid Ethereum address format")
        return v

    @field_validator("dealId")
    def validate_deal_id(cls, v):
        if v <= 0:
            raise ValueError("Value must be greater than zero")
        return v

class EscrowDealResponse(BaseModel):
    dealId: int
    invoiceTokenId: int
    msme: str
    investor: str
    buyer: str
    fundingAmount: int
    settlementAmount: int
    fundedAt: int
    dueDate: int
    status: int
    statusName: str
