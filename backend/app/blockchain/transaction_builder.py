from typing import Dict, Any
from eth_utils import to_checksum_address
from app.blockchain.provider import blockchain_provider
from app.blockchain.exceptions import TransactionPreparationError

def build_unsigned_transaction(
    from_address: str,
    to_address: str,
    contract_function,
    value_wei: int = 0,
    gas_multiplier: float = 1.25
) -> Dict[str, Any]:
    """
    Constructs an unsigned, JSON-serializable transaction dictionary for client signing.
    Estimates gas using on-chain dry-run validation.
    """
    w3 = blockchain_provider.get_w3()
    try:
        from_chk = to_checksum_address(from_address)
        to_chk = to_checksum_address(to_address)
    except ValueError as e:
        raise TransactionPreparationError(f"Invalid Ethereum address: {e}")

    try:
        # Estimate gas on-chain
        gas_estimate = contract_function.estimate_gas({
            "from": from_chk,
            "value": value_wei
        })
        gas_limit = int(gas_estimate * gas_multiplier)
    except Exception as e:
        raise TransactionPreparationError(f"Transaction estimation/dry-run failed: {e}")

    # Encode function selector and arguments
    calldata = contract_function._encode_transaction_data()

    return {
        "chainId": w3.eth.chain_id,
        "from": from_chk,
        "to": to_chk,
        "data": calldata,
        "value": hex(value_wei),
        "gas": hex(gas_limit)
    }
