import os
from dotenv import load_dotenv

load_dotenv()

BLOCKCHAIN_NETWORK = os.getenv("BLOCKCHAIN_NETWORK", "local").lower()
LOCAL_BLOCKCHAIN_RPC_URL = os.getenv("LOCAL_BLOCKCHAIN_RPC_URL", "http://127.0.0.1:8545")
POLYGON_AMOY_RPC_URL = os.getenv("POLYGON_AMOY_RPC_URL", "https://rpc-amoy.polygon.technology")
BLOCKCHAIN_VERIFIER_PRIVATE_KEY = os.getenv("BLOCKCHAIN_VERIFIER_PRIVATE_KEY", "")

# Validation checks
if BLOCKCHAIN_NETWORK not in ("local", "amoy"):
    BLOCKCHAIN_NETWORK = "local"
