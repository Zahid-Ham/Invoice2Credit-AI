import logging
from typing import Tuple
from app.invoice.utils.pdf_extractor import get_best_text, get_page_count

logger = logging.getLogger("PDFExtractorService")

def extract_pdf_text(file_bytes: bytes, filename: str) -> Tuple[str, int, bool]:
    """
    Extracts text locally from PDF.
    Returns:
    - extracted_text (str)
    - page_count (int)
    - is_scanned (bool): True if text length is insufficient (scanned/image PDF)
    """
    page_count = get_page_count(file_bytes)
    raw_text, extractor_used = get_best_text(file_bytes)
    
    if not raw_text or len(raw_text.strip()) < 30:
        logger.info(f"PDF {filename} contains minimal text ({len(raw_text) if raw_text else 0} chars). Scanned PDF detected.")
        return "", page_count, True
        
    return raw_text.strip(), page_count, False
