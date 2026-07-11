// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "./InvoiceNFT.sol";

interface IInvoiceEscrow {
    function createDeal(
        uint256 tokenId,
        address msme,
        address investor,
        uint256 fundingAmount,
        uint256 settlementAmount,
        uint256 dueDate
    ) external returns (uint256);
}

/**
 * @title InvoiceMarketplace
 * @notice Handles auction bidding for invoice financing.
 * @dev ReentrancyGuard is utilized to protect state-changing operations.
 * Inherits ERC721Holder to support safeTransferFrom from ERC721 tokens.
 */
contract InvoiceMarketplace is AccessControl, ReentrancyGuard, ERC721Holder {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    InvoiceNFT public immutable invoiceNFT;
    address public escrowContract;
    uint256 public nextAuctionId;

    struct Auction {
        uint256 auctionId;
        uint256 tokenId;
        address seller; // MSME
        uint256 minimumFundingAmount;
        uint256 startTime;
        uint256 endTime;
        bool active;
        bool settled;
    }

    struct Bid {
        address bidder;
        uint256 fundingAmount;
        uint256 discountRate; // In basis points (e.g. 500 = 5.00%)
        uint256 timestamp;
    }

    // Mapping from auction ID to Auction details
    mapping(uint256 => Auction) public auctions;

    // Mapping from auction ID to its bids
    mapping(uint256 => Bid[]) public bids;

    // Mapping to track active auctions for a given token ID to prevent multiple simultaneous auctions
    mapping(uint256 => uint256) public activeAuctionForToken;

    // Max safe discount rate for prototype (e.g. 3000 = 30%)
    uint256 public constant MAX_DISCOUNT_RATE = 3000;

    // Custom errors
    error AuctionNotActive();
    error AuctionAlreadySettled();
    error AuctionHasEnded();
    error AuctionNotEnded();
    error InvalidDuration();
    error InvalidFundingAmount();
    error InvalidDiscountRate();
    error NotSeller();
    error BidderIsZeroAddress();
    error EscrowContractNotSet();
    error ZeroAddress();
    error TokenAlreadyFinanced(uint256 tokenId);
    error AuctionAlreadyExistsForToken(uint256 tokenId);
    error SellerCannotBid();
    error BidAmountBelowMinimum();

    // Events
    event AuctionCreated(
        uint256 indexed auctionId,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 minimumFundingAmount,
        uint256 startTime,
        uint256 endTime
    );
    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 fundingAmount,
        uint256 discountRate,
        uint256 timestamp
    );
    event AuctionClosed(
        uint256 indexed auctionId,
        address indexed winner,
        uint256 fundingAmount,
        uint256 discountRate,
        uint256 indexed dealId
    );
    event AuctionCancelled(uint256 indexed auctionId, uint256 indexed tokenId);

    constructor(address _invoiceNFTAddress) {
        if (_invoiceNFTAddress == address(0)) revert ZeroAddress();
        invoiceNFT = InvoiceNFT(_invoiceNFTAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        nextAuctionId = 1;
    }

    /**
     * @notice Allows an admin to set the escrow contract address.
     */
    function setEscrowContract(address _escrowContract) external onlyRole(ADMIN_ROLE) {
        if (_escrowContract == address(0)) revert ZeroAddress();
        escrowContract = _escrowContract;
    }

    /**
     * @notice Creates a financing auction for a tokenized invoice.
     * @dev The seller must approve this contract or transfer via safeTransferFrom first.
     */
    function createAuction(
        uint256 tokenId,
        uint256 minimumFundingAmount,
        uint256 duration
    ) external nonReentrant returns (uint256) {
        if (duration == 0) revert InvalidDuration();
        if (minimumFundingAmount == 0) revert InvalidFundingAmount();
        if (invoiceNFT.financedTokens(tokenId)) revert TokenAlreadyFinanced(tokenId);
        if (activeAuctionForToken[tokenId] != 0) revert AuctionAlreadyExistsForToken(tokenId);
        
        address ownerOfToken = invoiceNFT.ownerOf(tokenId);
        if (ownerOfToken != msg.sender) revert NotSeller();

        // Escrow the NFT in this contract for the duration of the auction
        invoiceNFT.safeTransferFrom(msg.sender, address(this), tokenId);

        uint256 auctionId = nextAuctionId;
        nextAuctionId++;

        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + duration;

        auctions[auctionId] = Auction({
            auctionId: auctionId,
            tokenId: tokenId,
            seller: msg.sender,
            minimumFundingAmount: minimumFundingAmount,
            startTime: startTime,
            endTime: endTime,
            active: true,
            settled: false
        });

        activeAuctionForToken[tokenId] = auctionId;

        emit AuctionCreated(
            auctionId,
            tokenId,
            msg.sender,
            minimumFundingAmount,
            startTime,
            endTime
        );

        return auctionId;
    }

    /**
     * @notice Places a financing bid on an active auction.
     */
    function placeBid(
        uint256 auctionId,
        uint256 fundingAmount,
        uint256 discountRate
    ) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        if (!auction.active) revert AuctionNotActive();
        if (auction.settled) revert AuctionAlreadySettled();
        if (block.timestamp > auction.endTime) revert AuctionHasEnded();
        if (msg.sender == address(0)) revert BidderIsZeroAddress();
        if (msg.sender == auction.seller) revert SellerCannotBid();
        if (fundingAmount < auction.minimumFundingAmount) revert BidAmountBelowMinimum();
        if (discountRate == 0 || discountRate > MAX_DISCOUNT_RATE) revert InvalidDiscountRate();

        bids[auctionId].push(Bid({
            bidder: msg.sender,
            fundingAmount: fundingAmount,
            discountRate: discountRate,
            timestamp: block.timestamp
        }));

        emit BidPlaced(auctionId, msg.sender, fundingAmount, discountRate, block.timestamp);
    }

    /**
     * @notice Closes an auction and initiates the escrow deal with the winning bid.
     * @dev Winning logic: Lowest discount rate. Tie-breaker: Earliest bid.
     */
    function closeAuction(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        if (!auction.active) revert AuctionNotActive();
        if (auction.settled) revert AuctionAlreadySettled();
        if (block.timestamp <= auction.endTime) revert AuctionNotEnded();

        auction.active = false;
        auction.settled = true;
        activeAuctionForToken[auction.tokenId] = 0; // Clear active auction tracking

        Bid[] storage auctionBids = bids[auctionId];
        uint256 totalBids = auctionBids.length;

        if (totalBids == 0) {
            // Return NFT to the seller
            invoiceNFT.safeTransferFrom(address(this), auction.seller, auction.tokenId);
            emit AuctionCancelled(auctionId, auction.tokenId);
            return;
        }

        // Determine winning bid (lowest discount rate, earliest timestamp)
        Bid memory winningBid = auctionBids[0];
        for (uint256 i = 1; i < totalBids; i++) {
            if (auctionBids[i].discountRate < winningBid.discountRate) {
                winningBid = auctionBids[i];
            } else if (auctionBids[i].discountRate == winningBid.discountRate) {
                if (auctionBids[i].timestamp < winningBid.timestamp) {
                    winningBid = auctionBids[i];
                }
            }
        }

        if (escrowContract == address(0)) revert EscrowContractNotSet();

        // Mark the NFT as financed permanently on the NFT contract
        invoiceNFT.markAsFinanced(auction.tokenId);

        // Approve the escrow contract to transfer this NFT
        invoiceNFT.approve(escrowContract, auction.tokenId);

        // Fetch original invoice details for settlement amount
        (, , , uint256 invoiceAmount, uint256 dueDate, , , , ) = invoiceNFT.invoiceRecords(auction.tokenId);

        // Create the escrow deal on the escrow contract
        uint256 dealId = IInvoiceEscrow(escrowContract).createDeal(
            auction.tokenId,
            auction.seller,
            winningBid.bidder,
            winningBid.fundingAmount,
            invoiceAmount, // Settlement amount is the full value of the invoice
            dueDate
        );

        emit AuctionClosed(
            auctionId,
            winningBid.bidder,
            winningBid.fundingAmount,
            winningBid.discountRate,
            dealId
        );
    }

    /**
     * @notice Get all bids for a specific auction.
     */
    function getBids(uint256 auctionId) external view returns (Bid[] memory) {
        return bids[auctionId];
    }
}
