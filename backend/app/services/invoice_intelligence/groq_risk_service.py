import os
import json
import logging
from typing import Dict, Any, Tuple
from groq import Groq
from app.schemas.invoice_intelligence import ExtractedInvoice, AIAnalysisResponseSchema

logger = logging.getLogger("GroqRiskService")

# Configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

class GroqRiskService:
    def __init__(self):
        self._client = None

    @property
    def client(self) -> Groq:
        if not self._client:
            if not GROQ_API_KEY:
                logger.warning("GROQ_API_KEY environment variable is missing.")
            self._client = Groq(api_key=GROQ_API_KEY)
        return self._client

    def analyze_invoice_with_ai(
        self,
        raw_text: str,
        deterministic_signals: list
    ) -> Tuple[ExtractedInvoice, AIAnalysisResponseSchema]:
        """
        Submits raw invoice text + deterministic validation outputs to Groq.
        Returns validated ExtractedInvoice and AIAnalysisResponseSchema.
        """
        if not GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY is not configured. AI analysis unavailable.")

        system_prompt = (
            "You are an expert AI Invoice Risk Analyst and Data Extractor.\n"
            "Analyze the provided raw invoice text and deterministic validation signals.\n"
            "Return a JSON object containing exactly two keys:\n"
            "1. 'extracted_invoice': structured field data following the ExtractedInvoice schema.\n"
            "2. 'risk_analysis': risk evaluation following the AIAnalysisResponseSchema schema.\n\n"
            "Ensure that:\n"
            "- All decimal/monetary amounts are represented as floats or strings in the JSON.\n"
            "- Dates are in YYYY-MM-DD format.\n"
            "- risk_score is an integer between 0 and 100.\n"
            "- risk_level is exactly one of: LOW, MEDIUM, HIGH, CRITICAL.\n"
            "- risk_analysis.signals is a list of RiskSignal objects with source='AI'.\n"
            "Do NOT include any markdown packaging or conversational text. Return only the JSON object."
        )

        user_content = {
            "invoice_raw_text": raw_text[:3000], # limit context length
            "deterministic_signals": deterministic_signals
        }

        # Try active model and fallbacks
        models = [GROQ_MODEL, "llama-3.1-8b-instant"]
        last_err = None

        for model in models:
            try:
                logger.info(f"Sending invoice to Groq using model: {model}")
                chat_completion = self.client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": json.dumps(user_content)}
                    ],
                    model=model,
                    temperature=0.1,
                    response_format={"type": "json_object"}
                )
                raw_response = chat_completion.choices[0].message.content.strip()
                parsed = json.loads(raw_response)
                
                # Strict parsing into schemas
                extracted_data = ExtractedInvoice(**parsed["extracted_invoice"])
                risk_data = AIAnalysisResponseSchema(**parsed["risk_analysis"])
                
                # Check for validity of risk score boundaries
                if not (0 <= risk_data.risk_score <= 100):
                    raise ValueError(f"Risk score out of bounds: {risk_data.risk_score}")
                
                logger.info(f"Successfully processed AI extraction using {model}")
                return extracted_data, risk_data
                
            except Exception as e:
                logger.warning(f"Groq execution failed with model {model}: {e}")
                last_err = e
                continue

        raise RuntimeError(f"All Groq API models failed to execute or validate: {last_err}")

groq_risk_service = GroqRiskService()
