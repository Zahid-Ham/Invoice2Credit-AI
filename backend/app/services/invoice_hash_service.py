import hashlib
from typing import Dict, Any

def calculate_invoice_sha256(file_bytes: bytes) -> Dict[str, Any]:
    """
    Computes a deterministic SHA-256 hash/fingerprint of the raw file bytes.
    Returns both raw bytes32 digest and 0x-prefixed hex string.
    """
    digest = hashlib.sha256(file_bytes).digest()
    hex_digest = "0x" + digest.hex()
    return {
        "bytes32": digest,
        "hex": hex_digest,
        "algorithm": "SHA-256"
    }
