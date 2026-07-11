from pydantic import BaseModel, Field
from typing import Dict, Optional

class ContractAvailabilityResponse(BaseModel):
    available: bool
    address: Optional[str]

class BlockchainHealthResponse(BaseModel):
    status: str
    network: str
    chainId: int
    rpcConnected: bool
    signerConfigured: bool
    signerAddress: Optional[str]
    signerHasVerifierRole: bool
    contracts: Dict[str, ContractAvailabilityResponse]

class InvoiceHashResponse(BaseModel):
    algorithm: str
    invoice_hash: str = Field(..., alias="invoice_hash")
    is_already_tokenized: bool

    class Config:
        populate_by_name = True

class InvoiceNFTReadResponse(BaseModel):
    tokenId: int
    invoiceHash: str
    invoiceReference: str
    invoiceAmount: int
    dueDate: int
    msme: str
    buyer: str
    verified: bool
    mintedAt: int

class InvoiceMintTransactionResponse(BaseModel):
    success: bool
    network: str
    chainId: int
    contractAddress: str
    transactionHash: str
    blockNumber: int
    tokenId: int
    invoiceHash: str
    msmeWallet: str
    buyerWallet: str
