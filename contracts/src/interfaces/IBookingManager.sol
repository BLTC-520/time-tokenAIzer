// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IBookingManager {
    function availableHours(uint256 providerId) external view returns (uint256);

    function isQuoteValid(
        bytes32 quoteId,
        address buyer,
        uint256 providerId,
        uint256 hoursWad,
        uint256 slotId,
        uint256 expiresAt,
        uint256 nonce,
        bytes calldata signature
    ) external view returns (bool);
}
