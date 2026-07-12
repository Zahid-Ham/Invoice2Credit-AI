import io
import logging
from typing import Tuple

logger = logging.getLogger("ImageOCRService")

def perform_ocr(file_bytes: bytes, filename: str) -> Tuple[str, float, str]:
    """
    Performs OCR on image bytes using pytesseract (if available) with PIL.
    Falls back gracefully if pytesseract or the tesseract binary is missing.
    Returns:
    - raw_text (str)
    - confidence (float)
    - warning (str)
    """
    try:
        from PIL import Image
        import pytesseract
    except ImportError:
        logger.warning("Pillow or pytesseract not installed. Falling back to signature OCR.")
        return "", 0.0, "OCR libraries (pytesseract/Pillow) are not installed."

    try:
        # Open image
        image = Image.open(io.BytesIO(file_bytes))
        # Execute OCR
        text = pytesseract.image_to_string(image)
        logger.info(f"Successfully performed OCR on {filename} using pytesseract.")
        return text.strip(), 0.85, ""
    except Exception as e:
        logger.warning(f"pytesseract execution failed or system binary missing: {e}")
        # Return a warning indicating binary dependency requirement
        return (
            "", 
            0.0, 
            f"OCR system binary not found or failed to execute: {e}. "
            "Please ensure 'tesseract-ocr' is installed on your host/Render system."
        )
