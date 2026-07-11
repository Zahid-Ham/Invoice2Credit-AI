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
