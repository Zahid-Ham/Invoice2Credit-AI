from eth_account import Account
from app.blockchain.config import BLOCKCHAIN_VERIFIER_PRIVATE_KEY
from app.blockchain.provider import blockchain_provider
from app.blockchain.contracts import get_invoice_nft_contract
from app.blockchain.exceptions import BlockchainSignerError, VerifierRoleMissingError

class BlockchainSigner:
    def __init__(self):
        self.private_key = BLOCKCHAIN_VERIFIER_PRIVATE_KEY
        self.address = None
        self.account = None
        self.load_account()

    def load_account(self):
        if not self.private_key:
            # We don't fail immediately at class initialization so health check router can report it
            return

        try:
            formatted_key = self.private_key.strip()
            if not formatted_key.startswith("0x"):
                formatted_key = "0x" + formatted_key
            self.account = Account.from_key(formatted_key)
            self.address = self.account.address
        except Exception as e:
            raise BlockchainSignerError(f"Failed to load verifier private key: {e}")

    def check_verifier_role(self):
        if not self.account:
            raise BlockchainSignerError("Verifier private key is not configured.")

        try:
            contract = get_invoice_nft_contract()
            verifier_role = contract.functions.VERIFIER_ROLE().call()
            has_role = contract.functions.hasRole(verifier_role, self.address).call()
            if not has_role:
                raise VerifierRoleMissingError(
                    f"Derived address {self.address} does not hold VERIFIER_ROLE on contract {contract.address}"
                )
        except VerifierRoleMissingError:
            raise
        except Exception as e:
            raise BlockchainSignerError(f"Failed to verify on-chain verifier role for {self.address}: {e}")

blockchain_signer = BlockchainSigner()
