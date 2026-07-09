import fitz # PyMuPDF

class PDFService:
    def extract_text_from_bytes(self, file_bytes: bytes) -> str:
        """
        Extract raw text from PDF file bytes.
        """
        text = ""
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page in doc:
                text += page.get_text()
            doc.close()
        except Exception as e:
            raise ValueError(f"Failed to parse PDF document: {e}")
        return text.strip()

pdf_service = PDFService()
