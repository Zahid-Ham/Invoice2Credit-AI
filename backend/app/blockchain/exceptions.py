class BlockchainError(Exception):
    """Base exception for all blockchain errors."""
    pass

class BlockchainConfigurationError(BlockchainError):
    """Raised when there is a configuration error."""
    pass

class BlockchainConnectionError(BlockchainError):
    """Raised when connecting to the RPC provider fails."""
    pass

class ChainMismatchError(BlockchainError):
    """Raised when connected network Chain ID does not match expected Chain ID."""
    pass

class DeploymentConfigError(BlockchainError):
    """Raised when loading or parsing deployment manifest fails."""
    pass

class ABIFileError(BlockchainError):
    """Raised when loading or parsing ABI fails."""
    pass

class ContractUnavailableError(BlockchainError):
    """Raised when a requested contract is not available on the active network."""
    pass

class BlockchainSignerError(BlockchainError):
    """Raised when signer private key is invalid or fails loading."""
    pass

class VerifierRoleMissingError(BlockchainError):
    """Raised when signer address lacks VERIFIER_ROLE on-chain."""
    pass

class DuplicateInvoiceHashError(BlockchainError):
    """Raised when an invoice fingerprint has already been tokenized/used."""
    pass

class BlockchainTransactionError(BlockchainError):
    """Raised when transaction estimation, build, signing, or sending fails."""
    pass

class BlockchainReceiptTimeoutError(BlockchainError):
    """Raised when waiting for receipt times out."""
    pass

class BlockchainEventParsingError(BlockchainError):
    """Raised when log/event parsing fails."""
    pass

# Marketplace Exceptions
class MarketplaceListingNotFoundError(BlockchainError):
    """Raised when the requested listing or auction ID does not exist."""
    pass

class MarketplaceListingInactiveError(BlockchainError):
    """Raised when listing/auction has already ended, cancelled, or is inactive."""
    pass

class MarketplaceUnauthorizedCallerError(BlockchainError):
    """Raised when msg.sender lacks permission to list, bid, or close."""
    pass

class MarketplaceInvalidBidError(BlockchainError):
    """Raised when bid parameters (rates, amounts) are invalid."""
    pass

# Escrow Exceptions
class EscrowDealNotFoundError(BlockchainError):
    """Raised when the requested deal ID does not exist."""
    pass

class EscrowInvalidStateError(BlockchainError):
    """Raised when a deal status transition fails preconditions."""
    pass

class EscrowUnauthorizedCallerError(BlockchainError):
    """Raised when non-buyer attempts settlement or non-investor attempts funding."""
    pass

class InsufficientFundingValueError(BlockchainError):
    """Raised when payable msg.value does not match expected amount."""
    pass

class TransactionPreparationError(BlockchainError):
    """Raised when dry-running or building unsigned transaction fails."""
    pass
