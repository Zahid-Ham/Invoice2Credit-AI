"""
Unit tests for AI Invoice Intelligence Phase 1 backend services:
- deterministic_validator
- risk_service
- mint_eligibility_service
- file_validator
"""
import pytest
from decimal import Decimal
from unittest.mock import patch, MagicMock

# ─────────────────────────────────────────
# FILE VALIDATOR
# ─────────────────────────────────────────
from app.services.invoice_intelligence.file_validator import validate_invoice_file

PDF_MAGIC = b"%PDF-1.4 test invoice content" + b" " * 100
PNG_MAGIC = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
JPG_MAGIC = b"\xff\xd8\xff" + b"\x00" * 100

class TestFileValidator:
    def test_valid_pdf_by_magic(self):
        ok, result = validate_invoice_file(PDF_MAGIC, "inv.pdf", "application/pdf")
        assert ok is True
        assert result == "application/pdf"

    def test_valid_png_by_magic(self):
        ok, result = validate_invoice_file(PNG_MAGIC, "inv.png", "image/png")
        assert ok is True
        assert result == "image/png"

    def test_valid_jpg_by_magic(self):
        ok, result = validate_invoice_file(JPG_MAGIC, "inv.jpg", "image/jpeg")
        assert ok is True
        assert result == "image/jpeg"

    def test_empty_file_rejected(self):
        ok, result = validate_invoice_file(b"", "empty.pdf", "application/pdf")
        assert ok is False

    def test_oversized_file_rejected(self):
        big = b"%PDF-" + b"X" * (21 * 1024 * 1024)
        ok, result = validate_invoice_file(big, "big.pdf", "application/pdf")
        assert ok is False
        assert "size" in result.lower()

    def test_wrong_extension_rejected(self):
        ok, result = validate_invoice_file(PDF_MAGIC, "invoice.exe", "application/pdf")
        assert ok is False

    def test_mismatched_magic_rejected(self):
        # Claims to be PDF but has PNG magic bytes
        ok, result = validate_invoice_file(PNG_MAGIC, "invoice.pdf", "application/pdf")
        assert ok is False


# ─────────────────────────────────────────
# DETERMINISTIC VALIDATOR
# ─────────────────────────────────────────
from app.services.invoice_intelligence.deterministic_validator import validate_extracted_invoice
from app.schemas.invoice_intelligence import ExtractedInvoice

def _make_invoice(**kwargs) -> ExtractedInvoice:
    defaults = dict(
        invoice_number="INV-001",
        invoice_date="2026-06-01",
        due_date="2026-08-01",
        seller_name="Acme Textiles Pvt Ltd",
        seller_tax_id="22AAAAA0000A1Z5",
        buyer_name="Global Corp Ltd",
        buyer_tax_id="27BBBBB1111B1Z5",
        currency="INR",
        subtotal=10000.0,
        tax_amount=1800.0,
        total_amount=11800.0,
    )
    defaults.update(kwargs)
    return ExtractedInvoice(**defaults)

class TestDeterministicValidator:
    def test_clean_invoice_no_signals(self):
        inv = _make_invoice()
        signals = validate_extracted_invoice(inv)
        codes = [s["code"] for s in signals]
        # Clean invoice should not trigger critical signals
        assert "INVALID_DATE_ORDER" not in codes
        assert "AMOUNT_RECONCILIATION_MISMATCH" not in codes
        assert "INVALID_SELLER_GSTIN_FORMAT" not in codes

    def test_invalid_date_order(self):
        inv = _make_invoice(invoice_date="2026-09-01", due_date="2026-06-01")
        signals = validate_extracted_invoice(inv)
        codes = [s["code"] for s in signals]
        assert "INVALID_DATE_ORDER" in codes

    def test_future_invoice_date(self):
        inv = _make_invoice(invoice_date="2035-01-01", due_date="2035-06-01")
        signals = validate_extracted_invoice(inv)
        codes = [s["code"] for s in signals]
        assert "FUTURE_INVOICE_DATE" in codes

    def test_amount_reconciliation_mismatch(self):
        # Subtotal + Tax != Total
        inv = _make_invoice(subtotal=10000.0, tax_amount=1800.0, total_amount=9999.0)
        signals = validate_extracted_invoice(inv)
        codes = [s["code"] for s in signals]
        assert "AMOUNT_RECONCILIATION_MISMATCH" in codes

    def test_invalid_gstin_format(self):
        inv = _make_invoice(seller_tax_id="INVALID-GSTIN")
        signals = validate_extracted_invoice(inv)
        codes = [s["code"] for s in signals]
        assert "INVALID_SELLER_GSTIN_FORMAT" in codes

    def test_seller_buyer_identity_match(self):
        inv = _make_invoice(seller_name="Same Company Ltd", buyer_name="Same Company Ltd")
        signals = validate_extracted_invoice(inv)
        codes = [s["code"] for s in signals]
        assert "SELLER_BUYER_IDENTITY_MATCH" in codes

    def test_zero_total_amount(self):
        inv = _make_invoice(total_amount=0.0)
        signals = validate_extracted_invoice(inv)
        codes = [s["code"] for s in signals]
        assert "INVALID_TOTAL_AMOUNT" in codes

    def test_missing_invoice_number(self):
        inv = _make_invoice(invoice_number=None)
        signals = validate_extracted_invoice(inv)
        codes = [s["code"] for s in signals]
        assert "MISSING_INVOICE_NUMBER" in codes

    def test_unsupported_currency(self):
        inv = _make_invoice(currency="XYZ")
        signals = validate_extracted_invoice(inv)
        codes = [s["code"] for s in signals]
        assert "UNSUPPORTED_CURRENCY" in codes

    def test_missing_po_reference(self):
        inv = _make_invoice(purchase_order_reference=None)
        signals = validate_extracted_invoice(inv)
        codes = [s["code"] for s in signals]
        assert "MISSING_PURCHASE_ORDER" in codes

    def test_reconciliation_within_tolerance(self):
        # 10000 + 1800 = 11800, total = 11800.05 (within 0.10 tolerance)
        inv = _make_invoice(subtotal=10000.0, tax_amount=1800.0, total_amount=11800.05)
        signals = validate_extracted_invoice(inv)
        codes = [s["code"] for s in signals]
        assert "AMOUNT_RECONCILIATION_MISMATCH" not in codes


# ─────────────────────────────────────────
# RISK SERVICE
# ─────────────────────────────────────────
from app.services.invoice_intelligence.risk_service import aggregate_invoice_risk, resolve_risk_level

class TestRiskService:
    def test_resolve_risk_level_boundaries(self):
        assert resolve_risk_level(0) == "LOW"
        assert resolve_risk_level(24) == "LOW"
        assert resolve_risk_level(25) == "MEDIUM"
        assert resolve_risk_level(49) == "MEDIUM"
        assert resolve_risk_level(50) == "HIGH"
        assert resolve_risk_level(74) == "HIGH"
        assert resolve_risk_level(75) == "CRITICAL"
        assert resolve_risk_level(100) == "CRITICAL"

    def test_clean_invoice_low_risk(self):
        result = aggregate_invoice_risk([], 10)
        assert result["final_score"] == 5  # 0.5*0 + 0.5*10
        assert result["final_risk_level"] == "LOW"

    def test_exact_dup_override_forces_100(self):
        signals = [{"code": "EXACT_FILE_DUPLICATE"}]
        result = aggregate_invoice_risk(signals, 10)
        assert result["final_score"] == 100
        assert result["final_risk_level"] == "CRITICAL"

    def test_business_dup_forces_at_least_75(self):
        signals = [{"code": "BUSINESS_INVOICE_DUPLICATE"}]
        result = aggregate_invoice_risk(signals, 10)
        assert result["final_score"] >= 75
        assert result["final_risk_level"] == "CRITICAL"

    def test_invalid_date_order_forces_at_least_75(self):
        signals = [{"code": "INVALID_DATE_ORDER"}]
        result = aggregate_invoice_risk(signals, 0)
        assert result["final_score"] >= 75

    def test_combined_score_formula(self):
        # MISSING_INVOICE_NUMBER weight=15, ai_score=30
        signals = [{"code": "MISSING_INVOICE_NUMBER"}]
        result = aggregate_invoice_risk(signals, 30)
        # det=15, base = int(0.5*15 + 0.5*30) = int(7.5+15) = 22
        assert result["deterministic_score"] == 15
        assert result["ai_score"] == 30
        assert result["final_score"] == 22

    def test_score_capped_at_100(self):
        # Many high-weight signals + high AI score
        signals = [
            {"code": "EXACT_FILE_DUPLICATE"},
            {"code": "BUSINESS_INVOICE_DUPLICATE"},
            {"code": "SELLER_BUYER_IDENTITY_MATCH"},
            {"code": "INVALID_DATE_ORDER"},
        ]
        result = aggregate_invoice_risk(signals, 100)
        assert result["final_score"] <= 100


# ─────────────────────────────────────────
# MINT ELIGIBILITY SERVICE
# ─────────────────────────────────────────
from app.services.invoice_intelligence.mint_eligibility_service import check_mint_eligibility

def _eligible_invoice():
    return {
        "extractionStatus": "COMPLETED",
        "validationStatus": "COMPLETED",
        "aiAnalysisStatus": "COMPLETED",
        "verifierDecision": "APPROVED",
        "blockchainStatus": "UNMINTED",
        "invoiceHash": "0x" + "a" * 64,
        "msmeWallet": "0x" + "1" * 40,
        "buyerWallet": "0x" + "2" * 40,
        "duplicateStatus": "CLEAN",
        "riskSignals": [],
    }

class TestMintEligibilityService:
    def test_fully_eligible_invoice(self):
        result = check_mint_eligibility(_eligible_invoice())
        assert result["eligible"] is True
        assert result["reasons"] == []

    def test_pending_extraction_blocks(self):
        inv = _eligible_invoice()
        inv["extractionStatus"] = "PENDING"
        result = check_mint_eligibility(inv)
        assert result["eligible"] is False
        assert any("extraction" in r.lower() for r in result["reasons"])

    def test_pending_decision_blocks(self):
        inv = _eligible_invoice()
        inv["verifierDecision"] = "PENDING"
        result = check_mint_eligibility(inv)
        assert result["eligible"] is False
        assert any("approved" in r.lower() for r in result["reasons"])

    def test_rejected_decision_blocks(self):
        inv = _eligible_invoice()
        inv["verifierDecision"] = "REJECTED"
        result = check_mint_eligibility(inv)
        assert result["eligible"] is False

    def test_already_minted_blocks(self):
        inv = _eligible_invoice()
        inv["blockchainStatus"] = "MINTED"
        result = check_mint_eligibility(inv)
        assert result["eligible"] is False
        assert any("minted" in r.lower() for r in result["reasons"])

    def test_invalid_hash_blocks(self):
        inv = _eligible_invoice()
        inv["invoiceHash"] = "not-a-valid-hash"
        result = check_mint_eligibility(inv)
        assert result["eligible"] is False
        assert any("hash" in r.lower() for r in result["reasons"])

    def test_missing_msme_wallet_blocks(self):
        inv = _eligible_invoice()
        inv["msmeWallet"] = ""
        result = check_mint_eligibility(inv)
        assert result["eligible"] is False
        assert any("msme" in r.lower() for r in result["reasons"])

    def test_invalid_wallet_format_blocks(self):
        inv = _eligible_invoice()
        inv["msmeWallet"] = "not-a-wallet"
        result = check_mint_eligibility(inv)
        assert result["eligible"] is False

    def test_counterparty_wallet_collision_blocks(self):
        inv = _eligible_invoice()
        inv["buyerWallet"] = inv["msmeWallet"]
        result = check_mint_eligibility(inv)
        assert result["eligible"] is False
        assert any("identical" in r.lower() for r in result["reasons"])

    def test_cryptographic_duplicate_signal_blocks(self):
        inv = _eligible_invoice()
        inv["riskSignals"] = [{"code": "EXACT_FILE_DUPLICATE"}]
        result = check_mint_eligibility(inv)
        assert result["eligible"] is False
        assert any("duplicate" in r.lower() for r in result["reasons"])

    def test_evaluated_at_present(self):
        result = check_mint_eligibility(_eligible_invoice())
        assert "evaluatedAt" in result
        assert result["evaluatedAt"].endswith("Z")
