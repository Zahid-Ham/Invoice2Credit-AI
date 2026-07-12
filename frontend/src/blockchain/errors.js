export class BlockchainError extends Error {
  constructor(message, code = null) {
    super(message);
    this.name = 'BlockchainError';
    this.code = code;
  }
}

export class MetaMaskNotInstalledError extends BlockchainError {
  constructor() {
    super('MetaMask is not installed. Please install MetaMask to use Web3 features.');
    this.name = 'MetaMaskNotInstalledError';
  }
}

export class WalletConnectionRejectedError extends BlockchainError {
  constructor() {
    super('Wallet connection request rejected by user.');
    this.name = 'WalletConnectionRejectedError';
  }
}

export class WalletNotConnectedError extends BlockchainError {
  constructor() {
    super('No wallet connected. Please connect your MetaMask wallet first.');
    this.name = 'WalletNotConnectedError';
  }
}

export class UnsupportedNetworkError extends BlockchainError {
  constructor(expected, actual) {
    super(`Unsupported network. Expected ${expected}, but connected to ${actual}.`);
    this.name = 'UnsupportedNetworkError';
  }
}

export class NetworkSwitchRejectedError extends BlockchainError {
  constructor() {
    super('Network switch request was rejected.');
    this.name = 'NetworkSwitchRejectedError';
  }
}

export class WalletAccountMismatchError extends BlockchainError {
  constructor() {
    super('Active wallet account does not match the account prepared by the backend. Please switch accounts or prepare again.');
    this.name = 'WalletAccountMismatchError';
  }
}

export class TransactionRejectedError extends BlockchainError {
  constructor() {
    super('Transaction signing request was rejected by the user.');
    this.name = 'TransactionRejectedError';
  }
}

export class TransactionRevertedError extends BlockchainError {
  constructor(message = 'Transaction execution reverted on-chain.') {
    super(message);
    this.name = 'TransactionRevertedError';
  }
}

export class TransactionPreparationError extends BlockchainError {
  constructor(message) {
    super(message);
    this.name = 'TransactionPreparationError';
  }
}

export function parseMetaMaskError(error) {
  const code = error?.code || error?.info?.error?.code;
  const message = error?.message || '';

  if (code === 4001 || message.includes('rejected')) {
    return new TransactionRejectedError();
  }
  if (code === -32602 || message.includes('parameter')) {
    return new BlockchainError('Invalid transaction parameters sent to MetaMask.', code);
  }
  if (code === -32002 || message.includes('already pending')) {
    return new BlockchainError('A request is already pending in MetaMask. Please check the extension.', code);
  }
  if (message.includes('revert') || message.includes('reverted')) {
    return new TransactionRevertedError(message);
  }
  return new BlockchainError(message || 'An unexpected error occurred during transaction execution.', code);
}
