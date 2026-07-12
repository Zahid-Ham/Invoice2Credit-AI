from fastapi import Header, HTTPException, status, Depends
from firebase_admin import auth
from app.services.firebase.firebase_service import firebase_service, MockFirestore
import logging

logger = logging.getLogger("BlockchainAuth")

def get_current_user_uid(authorization: str = Header(None)) -> str:
    if not authorization:
        # Fallback for local frontend development: use the default verifier account
        return "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    
    token = authorization
    if authorization.startswith("Bearer "):
        token = authorization[7:]

    # Check if Firebase is initialized
    if firebase_service.app is None:
        # Fallback for local node testing/emulators
        return token

    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token["uid"]
    except Exception as e:
        logger.error(f"Firebase token verification failed: {e}")
        # Allow fallback to direct UID if local MockFirestore is active
        if isinstance(firebase_service.db, MockFirestore):
            return token
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Firebase ID token"
        )

def require_verifier_role(uid: str = Depends(get_current_user_uid)) -> str:
    db = firebase_service.db
    if not db or uid == "MOCK-VERIFIER-UID":
        return uid

    try:
        user_doc = db.collection("users").document(uid).get()
        if not user_doc.exists:
            # Fallback for dev: if mock user or user not in Firestore, allow if in local dev
            if firebase_service.app is None:
                return uid
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User profile '{uid}' not found in database."
            )
        
        user_data = user_doc.to_dict()
        role = user_data.get("role", "").lower()
        if role not in ("verifier", "admin", "platform_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Unauthorized: User role '{role}' is not verifier or admin."
            )
        return uid
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking user role: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database role verification failed: {e}"
        )
