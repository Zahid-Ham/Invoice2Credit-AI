// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./InvoiceEscrow.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IInvoiceRegistry {
    function updateReputation(address msme, bool isLate) external;
}

/**
 * @title EscrowFactory
 * @notice Deploys one InvoiceEscrow per approved invoice tokenId.
 *         Owned by the platform backend wallet.
 */
contract EscrowFactory is Ownable {
    mapping(uint256 => address) public escrows;
    IInvoiceRegistry public invoiceRegistry;


    event EscrowCreated(
        uint256 indexed tokenId,
        address indexed escrowAddress,
        address indexed msme,
        uint256 invoiceAmount,
        uint256 dueDate
    );

    error EscrowAlreadyExists(uint256 tokenId);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Deploy a new InvoiceEscrow for the given tokenId.
     * @param msme          Address of the MSME invoice owner.
     * @param buyer         Address of the corporate buyer.
     * @param tokenId       ERC-721 token ID from InvoiceRegistry.
     * @param invoiceAmount Full face value of the invoice (wei).
     * @param dueDate       Unix timestamp of repayment due date.
     */
    function createEscrow(
        address msme,
        address buyer,
        uint256 tokenId,
        uint256 invoiceAmount,
        uint256 dueDate
    ) external onlyOwner returns (address) {
        if (escrows[tokenId] != address(0)) {
            revert EscrowAlreadyExists(tokenId);
        }

        InvoiceEscrow escrow = new InvoiceEscrow(
            msme,
            buyer,
            tokenId,
            invoiceAmount,
            dueDate
        );

        escrows[tokenId] = address(escrow);

        emit EscrowCreated(tokenId, address(escrow), msme, invoiceAmount, dueDate);

        return address(escrow);
    }

    /// @notice Convenience getter: returns escrow address for a tokenId
    function getEscrow(uint256 tokenId) external view returns (address) {
        return escrows[tokenId];
    }

    function setRegistry(address _registry) external onlyOwner {
        invoiceRegistry = IInvoiceRegistry(_registry);
    }

    /**
     * @notice Proxies reputation update to the Registry.
     *         Only callable by a deployed InvoiceEscrow contract.
     */
    function recordRepayment(address msme, bool isLate, uint256 tokenId) external {
        require(escrows[tokenId] == msg.sender, "Unauthorized Escrow");
        if (address(invoiceRegistry) != address(0)) {
            invoiceRegistry.updateReputation(msme, isLate);
        }
    }
}

