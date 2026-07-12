import logging
from typing import Tuple

logger = logging.getLogger("FileValidator")

MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20MB
MIN_FILE_SIZE_BYTES = 64                 # Reject obviously empty/corrupt files

# Magic bytes → detected MIME
MAGIC_BYTES = {
    b"%PDF": "application/pdf",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"\xff\xd8\xff": "image/jpeg",
}

# Allowed extension → canonical MIME
ALLOWED_EXTENSIONS = {
    "pdf": "application/pdf",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
}

# MIME → allowed magic prefixes for cross-validation
MIME_TO_MAGIC = {
    "application/pdf": [b"%PDF"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/jpeg": [b"\xff\xd8\xff"],
}


def validate_invoice_file(file_bytes: bytes, filename: str, content_type: str) -> Tuple[bool, str]:
    """
    Validates the uploaded invoice file.

    Checks (in order):
    1. File is not empty (minimum 64 bytes).
    2. File does not exceed 20 MB.
    3. Extension is in the allowed whitelist (pdf, png, jpg, jpeg).
    4. Magic bytes match the declared/expected MIME type.

    Returns:
        (True, detected_mime_type) on success.
        (False, error_reason_str) on failure.
    """
    # 1. Empty file check
    if not file_bytes or len(file_bytes) < MIN_FILE_SIZE_BYTES:
        return False, f"File is empty or too small ({len(file_bytes)} bytes). Minimum is {MIN_FILE_SIZE_BYTES} bytes."

    # 2. Size limit check
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        return False, f"File size exceeds limit of 20MB (got {len(file_bytes) / 1024 / 1024:.2f}MB)."

    # 3. Extension whitelist check
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        return False, (
            f"Unsupported file extension '.{ext}'. "
            f"Allowed extensions: {', '.join(ALLOWED_EXTENSIONS.keys())}."
        )

    expected_mime = ALLOWED_EXTENSIONS[ext]

    # 4. Magic bytes detection
    detected_mime = None
    for sig, mime in MAGIC_BYTES.items():
        if file_bytes.startswith(sig):
            detected_mime = mime
            break

    if detected_mime is None:
        return False, (
            f"File signature (magic bytes) does not match any supported format. "
            f"File '{filename}' appears to be corrupt or misnamed."
        )

    # 5. Cross-check: detected magic must match the extension's expected MIME
    if detected_mime != expected_mime:
        return False, (
            f"File content mismatch: extension '.{ext}' expects {expected_mime}, "
            f"but file magic bytes indicate {detected_mime}. "
            "File may be misnamed or tampered."
        )

    logger.info(f"File '{filename}' validated successfully as {detected_mime} ({len(file_bytes)} bytes).")
    return True, detected_mime
