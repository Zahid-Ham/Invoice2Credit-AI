import os
import logging
import firebase_admin
from firebase_admin import credentials, firestore

logger = logging.getLogger("Invoice2Credit-Firebase")

class FirebaseService:
    def __init__(self):
        self.db = None
        self.app = None
        
    def initialize(self):
        cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
        if not cred_path:
            logger.warning("FIREBASE_CREDENTIALS_PATH env not set. Skipping Firebase Admin initialization.")
            return

        if not os.path.exists(cred_path):
            logger.warning(f"Firebase credentials JSON not found at {cred_path}. Admin features will be unavailable.")
            return
            
        try:
            cred = credentials.Certificate(cred_path)
            self.app = firebase_admin.initialize_app(cred)
            self.db = firestore.client()
            logger.info("Firebase Admin SDK initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin SDK: {e}")

# Central Instance
firebase_service = FirebaseService()
