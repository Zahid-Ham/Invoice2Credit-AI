"""
extraction_service.py
─────────────────────
Clean abstraction layer for invoice field extraction.

Architecture:
  BaseExtractor (ABC)
      └── PDFParserExtractor   ← active now (pdfplumber / fitz / pdfminer)
      └── (future) OCRExtractor, GroqVisionExtractor …

ExtractionService wraps the active extractor and exposes
  extract_from_bytes(file_bytes, filename) → ExtractionResult

To upgrade to OCR: create a new subclass of BaseExtractor and pass it to
ExtractionService().  Zero frontend or route changes required.
"""

from __future__ import annotations
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict

from app.invoice.utils.pdf_extractor import get_best_text, extract_fields, get_page_count

logger = logging.getLogger("ExtractionService")


# ─── Data classes ─────────────────────────────────────────────────────────

@dataclass
class FieldResult:
    """A single extracted field with provenance metadata."""
    value: Any
    confidence: float          # 0.0 → 1.0
    source: str = "pdf_parser" # "pdf_parser" | "ocr" | "manual" | …

    @property
    def label(self) -> str:
        if self.confidence >= 0.85:
            return "high"
        if self.confidence >= 0.60:
            return "medium"
        return "low"

    def to_dict(self) -> dict:
        return {
            "value":           self.value,
            "confidence":      round(self.confidence, 3),
            "confidenceLabel": self.label,     # "high" | "medium" | "low"
            "source":          self.source,
        }


@dataclass
class ExtractionResult:
    """Complete extraction result envelope."""
    fields:            Dict[str, FieldResult] = field(default_factory=dict)
    rawTextSnippet:    str   = ""
    pageCount:         int   = 0
    extractorUsed:     str   = "pdf_parser"
    overallConfidence: float = 0.0
    success:           bool  = True
    message:           str   = ""

    def to_dict(self) -> dict:
        confidences = [f.confidence for f in self.fields.values() if f.confidence > 0]
        return {
            "success":           self.success,
            "message":           self.message,
            "fields":            {k: v.to_dict() for k, v in self.fields.items()},
            "rawTextSnippet":    self.rawTextSnippet,
            "pageCount":         self.pageCount,
            "extractorUsed":     self.extractorUsed,
            "overallConfidence": round(
                sum(confidences) / len(confidences) if confidences else 0.0, 3
            ),
        }


# ─── Extractor interface ───────────────────────────────────────────────────

class BaseExtractor(ABC):
    """
    Abstract base.  Implement extract() in any subclass to plug in
    OCR, cloud vision, or any other backend transparently.
    """
    @abstractmethod
    def extract(self, file_bytes: bytes, filename: str) -> ExtractionResult:
        raise NotImplementedError


# ─── Concrete PDF extractor ────────────────────────────────────────────────

class PDFParserExtractor(BaseExtractor):
    """
    Uses pdfplumber → PyMuPDF → pdfminer.six in order of preference.
    Returns an ExtractionResult with per-field confidence scores.
    """

    def extract(self, file_bytes: bytes, filename: str) -> ExtractionResult:
        logger.info("[PDFParserExtractor] Processing %s (%d bytes)", filename, len(file_bytes))

        raw_text, extractor_name = get_best_text(file_bytes)

        if not raw_text or len(raw_text.strip()) < 30:
            logger.warning("[PDFParserExtractor] Insufficient text — likely scanned/image PDF")
            return ExtractionResult(
                success=False,
                message="Could not extract text. This may be a scanned PDF — OCR will improve results.",
                extractorUsed=extractor_name,
                pageCount=get_page_count(file_bytes),
            )

        raw_fields = extract_fields(raw_text)

        field_results: Dict[str, FieldResult] = {
            name: FieldResult(
                value=data["value"],
                confidence=data["confidence"],
                source="pdf_parser",
            )
            for name, data in raw_fields.items()
        }

        page_count = get_page_count(file_bytes)
        snippet = raw_text[:800].replace("\n", " ")

        logger.info(
            "[PDFParserExtractor] Done. extractor=%s pages=%d fields=%d",
            extractor_name, page_count, len(field_results),
        )

        return ExtractionResult(
            fields=field_results,
            rawTextSnippet=snippet,
            pageCount=page_count,
            extractorUsed=extractor_name,
            success=True,
            message="Extraction completed successfully.",
        )


class GeminiExtractor(BaseExtractor):
    """
    Uses Google Gemini 1.5/2.5 Flash API to extract fields with high accuracy.
    """

    def extract(self, file_bytes: bytes, filename: str) -> ExtractionResult:
        logger.info("[GeminiExtractor] Processing %s (%d bytes)", filename, len(file_bytes))
        
        # First extract raw text
        raw_text, parser_name = get_best_text(file_bytes)
        page_count = get_page_count(file_bytes)
        
        if not raw_text or len(raw_text.strip()) < 10:
            return ExtractionResult(
                success=False,
                message="PDF has no extractable text. Scanned document support requires vision model input.",
                extractorUsed="GeminiExtractor",
                pageCount=page_count,
            )

        # Call Gemini API
        api_key = os.getenv("GEMINI_API_KEY") or "AIzaSyDYsLS0TqOfgSaMS7S26K1W7ItEpGpNIG8"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        
        prompt = (
            "You are a professional invoice parser. Extract the following fields from this invoice text: "
            "invoiceNumber, sellerGST, buyerGST, invoiceDate, dueDate, invoiceAmount, taxAmount, currency, "
            "sellerName, buyerName. "
            "Return ONLY a clean JSON object containing these keys. "
            "For dates, use YYYY-MM-DD. For amounts, use numeric values. "
            "If a field is not found, use empty string for strings, or 0 for numeric amounts. "
            "Here is the invoice text:\n\n"
            f"{raw_text}"
        )
        
        import requests
        import json
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        
        try:
            res = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=10)
            res.raise_for_status()
            res_data = res.json()
            raw_json = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
            
            # Parse response
            parsed = json.loads(raw_json)
            
            field_results: Dict[str, FieldResult] = {}
            for k in ["invoiceNumber", "sellerGST", "buyerGST", "invoiceDate", "dueDate", 
                      "invoiceAmount", "taxAmount", "currency", "sellerName", "buyerName"]:
                val = parsed.get(k, "")
                # Format check/fallback
                if k in ["invoiceAmount", "taxAmount"]:
                    try:
                        val = float(str(val).replace(",", "").strip())
                    except ValueError:
                        val = 0.0
                
                field_results[k] = FieldResult(
                    value=val,
                    confidence=0.98 if val else 0.0,
                    source="gemini_ocr"
                )
                
            return ExtractionResult(
                fields=field_results,
                rawTextSnippet=raw_text[:800],
                pageCount=page_count,
                extractorUsed="GeminiExtractor",
                success=True,
                message="Successfully parsed using Gemini AI OCR."
            )
        except Exception as e:
            logger.error(f"[GeminiExtractor] API failed: {e}. Falling back to regex parser...")
            # Fallback to regex parser
            fallback = PDFParserExtractor()
            return fallback.extract(file_bytes, filename)


# ─── Service wrapper ───────────────────────────────────────────────────────

import os

class ExtractionService:
    """
    Delegates to whatever BaseExtractor is active.
    Hot-swap by calling use_extractor() — no routes or schemas change.
    """

    def __init__(self, extractor: BaseExtractor | None = None):
        self._extractor: BaseExtractor = extractor or GeminiExtractor()

    def use_extractor(self, extractor: BaseExtractor) -> None:
        """Runtime swap — plug in OCR here when ready."""
        self._extractor = extractor
        logger.info("[ExtractionService] Extractor switched → %s", type(extractor).__name__)

    def extract_from_bytes(self, file_bytes: bytes, filename: str) -> ExtractionResult:
        try:
            return self._extractor.extract(file_bytes, filename)
        except Exception as exc:
            logger.exception("[ExtractionService] Extractor crashed: %s", exc)
            return ExtractionResult(
                success=False,
                message=f"Extraction error: {exc}",
                extractorUsed=type(self._extractor).__name__,
            )


# ─── Global singleton ──────────────────────────────────────────────────────
# To upgrade: extraction_service.use_extractor(GroqVisionExtractor())
extraction_service = ExtractionService()

