// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IInvoiceNFT {
    function invoiceRecords(uint256 tokenId)
        external
        view
        returns (
            uint256 tokenIdVal,
            bytes32 invoiceHash,
            string memory invoiceReference,
            uint256 invoiceAmount,
            uint256 dueDate,
            address msme,
            address buyer,
            bool verified,
            uint256 mintedAt
        );
}

/**
 * @title InvoiceEscrow
 * @notice Handles the escrow, funding, and settlement lifecycle of invoice financing deals.
 * @dev Inherits ERC721Holder and ReentrancyGuard. Enforces strict financial accounting.
 */
contract InvoiceEscrow is ReentrancyGuard, ERC721Holder {
    address public immutable invoiceNFTAddress;
    address public immutable marketplaceAddress;
    uint256 public nextDealId;

    enum Status {
        CREATED,
        FUNDED,
        MSME_RELEASED,
        SETTLED
    }

    struct EscrowDeal {
        uint256 dealId;
        uint256 invoiceTokenId;
        address msme;
        address investor;
        address buyer;
        uint256 fundingAmount;
        uint256 settlementAmount;
        uint256 fundedAt;
        uint256 dueDate;
        Status status;
    }

    // Mapping from deal ID to EscrowDeal details
    mapping(uint256 => EscrowDeal) public deals;

    // Custom errors
    error OnlyMarketplace();
    error InvalidDealStatus();
    error NotInvestor();
    error NotBuyer();
    error IncorrectFundingAmount();
    error IncorrectSettlementAmount();
    error TransferFailed();
    error ZeroAddress();
    error InvalidAmount();
    error InvalidDueDate();

    // Events
    event DealCreated(
        uint256 indexed dealId,
        uint256 indexed invoiceTokenId,
        address indexed msme,
        address investor,
        address buyer,
        uint256 fundingAmount,
        uint256 settlementAmount,
        uint256 dueDate
    );
    event DealFunded(uint256 indexed dealId, address indexed investor, uint256 fundedAt);
    event FundingReleased(uint256 indexed dealId, address indexed msme, uint256 amount);
    event InvoiceSettled(uint256 indexed dealId, address indexed buyer, uint256 amount);
    event DealStatusChanged(uint256 indexed dealId, Status status);

    modifier onlyMarketplace() {
        if (msg.sender != marketplaceAddress) revert OnlyMarketplace();
        _;
    }

    constructor(address _invoiceNFTAddress, address _marketplaceAddress) {
        if (_invoiceNFTAddress == address(0) || _marketplaceAddress == address(0)) revert ZeroAddress();
        invoiceNFTAddress = _invoiceNFTAddress;
        marketplaceAddress = _marketplaceAddress;
        nextDealId = 1;
    }

    /**
     * @notice Creates a new escrow deal. Called only by the authorized marketplace.
     */
    function createDeal(
        uint256 tokenId,
        address msme,
        address investor,
        uint256 fundingAmount,
        uint256 settlementAmount,
        uint256 dueDate
    ) external onlyMarketplace returns (uint256) {
        if (msme == address(0) || investor == address(0)) revert ZeroAddress();
        if (fundingAmount == 0 || settlementAmount == 0) revert InvalidAmount();
        if (dueDate <= block.timestamp) revert InvalidDueDate();

        // Retrieve the authoritative corporate buyer address from the InvoiceNFT contract
        (,,,,,, address buyer,,) = IInvoiceNFT(invoiceNFTAddress).invoiceRecords(tokenId);
        if (buyer == address(0)) revert ZeroAddress();

        // Escrow the NFT in this contract
        IERC721(invoiceNFTAddress).safeTransferFrom(msg.sender, address(this), tokenId);

        uint256 dealId = nextDealId;
        nextDealId++;

        deals[dealId] = EscrowDeal({
            dealId: dealId,
            invoiceTokenId: tokenId,
            msme: msme,
            investor: investor,
            buyer: buyer,
            fundingAmount: fundingAmount,
            settlementAmount: settlementAmount,
            fundedAt: 0,
            dueDate: dueDate,
            status: Status.CREATED
        });

        emit DealCreated(
            dealId,
            tokenId,
            msme,
            investor,
            buyer,
            fundingAmount,
            settlementAmount,
            dueDate
        );

        return dealId;
    }

    /**
     * @notice Allows the investor to deposit the exact required funding amount into escrow.
     */
    function fundDeal(uint256 dealId) external payable nonReentrant {
        EscrowDeal storage deal = deals[dealId];
        if (deal.status != Status.CREATED) revert InvalidDealStatus();
        if (msg.sender != deal.investor) revert NotInvestor();
        if (msg.value != deal.fundingAmount) revert IncorrectFundingAmount();

        deal.status = Status.FUNDED;
        deal.fundedAt = block.timestamp;

        emit DealFunded(dealId, msg.sender, block.timestamp);
        emit DealStatusChanged(dealId, Status.FUNDED);
    }

    /**
     * @notice Releases the deposited funding amount to the MSME.
     */
    function releaseFundingToMSME(uint256 dealId) external nonReentrant {
        EscrowDeal storage deal = deals[dealId];
        if (deal.status != Status.FUNDED) revert InvalidDealStatus();

        deal.status = Status.MSME_RELEASED;

        (bool success, ) = payable(deal.msme).call{value: deal.fundingAmount}("");
        if (!success) revert TransferFailed();

        emit FundingReleased(dealId, deal.msme, deal.fundingAmount);
        emit DealStatusChanged(dealId, Status.MSME_RELEASED);
    }

    /**
     * @notice Settles the invoice. The assigned buyer pays the full settlement amount,
     * which is sent to the investor. The NFT is then returned to the MSME.
     */
    function settleInvoice(uint256 dealId) external payable nonReentrant {
        EscrowDeal storage deal = deals[dealId];
        if (deal.status != Status.MSME_RELEASED) revert InvalidDealStatus();
        if (msg.sender != deal.buyer) revert NotBuyer();
        if (msg.value != deal.settlementAmount) revert IncorrectSettlementAmount();

        deal.status = Status.SETTLED;

        // Release the settlement amount to the investor
        (bool success, ) = payable(deal.investor).call{value: deal.settlementAmount}("");
        if (!success) revert TransferFailed();

        // Return the NFT to the MSME upon successful settlement (completes lifecycle)
        IERC721(invoiceNFTAddress).safeTransferFrom(address(this), deal.msme, deal.invoiceTokenId);

        emit InvoiceSettled(dealId, msg.sender, deal.settlementAmount);
        emit DealStatusChanged(dealId, Status.SETTLED);
    }
}
