from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from eth_utils import is_address

class UnsignedTransactionPayload(BaseModel):
    chainId: int
    from_address: str = Field(..., alias="from")
    to: str
    data: str
    value: str
    gas: str

    class Config:
        populate_by_name = True

class PrepareTransactionResponse(BaseModel):
    signingMode: str = "USER_WALLET"
    network: str
    chainId: int
    contract: str
    action: str
    transaction: UnsignedTransactionPayload

class CreateAuctionRequest(BaseModel):
    tokenId: int
    minimumFundingAmount: int
    duration: int
    sellerAddress: str

    @field_validator("sellerAddress")
    def validate_seller_address(cls, v):
        if not is_address(v):
            raise ValueError("Invalid Ethereum address format")
        return v

    @field_validator("tokenId", "minimumFundingAmount", "duration")
    def validate_positive_integers(cls, v):
        if v <= 0:
            raise ValueError("Value must be greater than zero")
        return v

class PlaceBidRequest(BaseModel):
    auctionId: int
    fundingAmount: int
    discountRate: int
    bidderAddress: str

    @field_validator("bidderAddress")
    def validate_bidder_address(cls, v):
        if not is_address(v):
            raise ValueError("Invalid Ethereum address format")
        return v

    @field_validator("auctionId", "fundingAmount", "discountRate")
    def validate_positive_integers(cls, v):
        if v <= 0:
            raise ValueError("Value must be greater than zero")
        return v

class CloseAuctionRequest(BaseModel):
    auctionId: int
    callerAddress: str

    @field_validator("callerAddress")
    def validate_caller_address(cls, v):
        if not is_address(v):
            raise ValueError("Invalid Ethereum address format")
        return v

    @field_validator("auctionId")
    def validate_auction_id(cls, v):
        if v <= 0:
            raise ValueError("Value must be greater than zero")
        return v

class BidResponse(BaseModel):
    bidder: str
    fundingAmount: int
    discountRate: int
    timestamp: int

class AuctionResponse(BaseModel):
    auctionId: int
    tokenId: int
    seller: str
    minimumFundingAmount: int
    startTime: int
    endTime: int
    active: bool
    settled: bool
