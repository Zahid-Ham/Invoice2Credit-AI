// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEscrowFactory {
    function recordRepayment(address msme, bool isLate, uint256 tokenId) external;
}

/**
 * @title InvoiceEscrow
 * @notice Holds MATIC in escrow for a single tokenized invoice.
 *         Investor calls fundInvoice() directly with their wallet (MetaMask).
 *         Buyer repayment releases funds to the investor.
 *         Owner (EscrowFactory) can cancel if invoice defaults.
 */
contract InvoiceEscrow {
    enum State { OPEN, FUNDED, REPAID, DEFAULTED }

    address public immutable factory;
    address public immutable msme;
    address public immutable buyer;
    uint256 public immutable tokenId;
    uint256 public immutable invoiceAmount;
    uint256 public immutable dueDate;

    address public investor;
    State   public state;

    event Funded(address indexed investor, uint256 amount);
    event Repaid(address indexed buyer, uint256 amount, bool isLate);
    event Defaulted(uint256 tokenId);

    error AlreadyFunded(address existingInvestor);
    error FundingAmountMismatch(uint256 sent, uint256 required);
    error NotBuyer(address caller);
    error InsufficientRepayment(uint256 sent, uint256 required);

    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory");
        _;
    }

    modifier inState(State expected) {
        require(state == expected, "Invalid state");
        _;
    }

    constructor(
        address _msme,
        address _buyer,
        uint256 _tokenId,
        uint256 _invoiceAmount,
        uint256 _dueDate
    ) {
        factory       = msg.sender;
        msme          = _msme;
        buyer         = _buyer;
        tokenId       = _tokenId;
        invoiceAmount = _invoiceAmount;
        dueDate       = _dueDate;
        state         = State.OPEN;
    }

    /**
     * @notice Any investor can call this directly from their wallet (MetaMask).
     *         Must send exactly invoiceAmount in msg.value.
     *         Reverts if already funded or amount is wrong.
     */
    function fundInvoice() external payable inState(State.OPEN) {
        if (msg.value != invoiceAmount) {
            revert FundingAmountMismatch(msg.value, invoiceAmount);
        }
        investor = msg.sender;
        state    = State.FUNDED;
        emit Funded(msg.sender, msg.value);
    }

    /// @notice Internal: factory-proxied fund (kept for admin tooling)
    function fund(address _investor) external payable onlyFactory inState(State.OPEN) {
        if (investor != address(0)) {
            revert AlreadyFunded(investor);
        }
        if (msg.value < invoiceAmount) {
            revert FundingAmountMismatch(msg.value, invoiceAmount);
        }
        investor = _investor;
        state    = State.FUNDED;
        emit Funded(_investor, msg.value);
    }

    /// @notice Buyer repays, releasing funds to investor
    function releasePayment() external payable inState(State.FUNDED) {
        if (msg.sender != buyer) revert NotBuyer(msg.sender);
        if (msg.value < invoiceAmount) revert InsufficientRepayment(msg.value, invoiceAmount);
        
        bool isLate = block.timestamp > dueDate;
        state = State.REPAID;
        
        payable(investor).transfer(msg.value);
        
        try IEscrowFactory(factory).recordRepayment(msme, isLate, tokenId) {} catch {}
        
        emit Repaid(msg.sender, msg.value, isLate);
    }

    /// @notice Admin marks invoice defaulted; investor retrieves deposit
    function markDefault() external onlyFactory inState(State.FUNDED) {
        state = State.DEFAULTED;
        if (investor != address(0)) {
            payable(investor).transfer(address(this).balance);
        }
        emit Defaulted(tokenId);
    }

    /// @notice View helpers for frontend polling
    function getState() external view returns (uint8) {
        return uint8(state);
    }
}
