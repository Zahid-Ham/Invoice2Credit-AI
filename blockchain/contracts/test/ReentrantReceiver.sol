// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IInvoiceEscrow {
    function fundDeal(uint256 dealId) external payable;
    function releaseFundingToMSME(uint256 dealId) external;
    function settleInvoice(uint256 dealId) external payable;
}

interface IInvoiceMarketplace {
    function createAuction(uint256 tokenId, uint256 minimumFundingAmount, uint256 duration) external returns (uint256);
}

/**
 * @title ReentrantReceiver
 * @notice Malicious contract used to test reentrancy security on InvoiceEscrow.
 */
contract ReentrantReceiver is ERC721Holder {
    address public targetEscrow;
    uint256 public targetDealId;
    bool public attacking;
    bytes32 public attackTypeHash;

    bytes32 private constant ATTACK_RELEASE = keccak256(abi.encodePacked("release"));
    bytes32 private constant ATTACK_SETTLE = keccak256(abi.encodePacked("settle"));

    constructor(address _targetEscrow) {
        targetEscrow = _targetEscrow;
    }

    function approveNFT(address nft, address spender, uint256 tokenId) external {
        IERC721(nft).approve(spender, tokenId);
    }

    function executeCreateAuction(address marketplace, uint256 tokenId, uint256 minimumFundingAmount, uint256 duration) external {
        IInvoiceMarketplace(marketplace).createAuction(tokenId, minimumFundingAmount, duration);
    }

    function executeFund(uint256 dealId, uint256 amount) external payable {
        IInvoiceEscrow(targetEscrow).fundDeal{value: amount}(dealId);
    }

    function prepareAttack(uint256 _dealId, string calldata _type) external {
        targetDealId = _dealId;
        attackTypeHash = keccak256(abi.encodePacked(_type));
        attacking = true;
    }

    receive() external payable {
        if (attacking) {
            attacking = false; // Prevent infinite gas loop to verify the revert type
            if (attackTypeHash == ATTACK_RELEASE) {
                IInvoiceEscrow(targetEscrow).releaseFundingToMSME(targetDealId);
            } else if (attackTypeHash == ATTACK_SETTLE) {
                IInvoiceEscrow(targetEscrow).settleInvoice{value: msg.value}(targetDealId);
            }
        }
    }
}
