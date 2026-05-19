// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseHook} from "@uniswap/v4-periphery/src/utils/BaseHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {
    BeforeSwapDelta,
    BeforeSwapDeltaLibrary
} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

import {IBookingManager} from "./interfaces/IBookingManager.sol";

contract TimePoolHook is BaseHook {
    using PoolIdLibrary for PoolKey;

    struct HookData {
        address buyer;
        uint256 providerId;
        uint256 hoursWad;
        uint256 slotId;
        bytes32 quoteId;
        uint256 expiresAt;
        uint256 nonce;
        bytes signature;
    }

    IBookingManager public immutable booking;
    address public owner;

    mapping(PoolId poolId => bool allowed) public allowedPool;
    mapping(address router => bool allowed) public allowedRouter;
    mapping(bytes32 quoteId => bool consumed) public consumedHookQuote;
    mapping(address router => bool trusted) public routerCanConsumeQuotes;

    bool public requireHookDataForSwap;
    bool public enforceSingleUseQuote;

    error NotOwner();
    error PoolNotAllowed();
    error RouterNotAllowed();
    error MissingBuyer();
    error MissingHookData();
    error MissingBookingManager();
    error MissingOwner();
    error QuoteAlreadyConsumed();
    error RouterNotTrustedForQuoteConsumption();
    error InvalidQuote();
    error InvalidHours();
    error InsufficientInventory();

    event PoolAllowed(PoolId indexed poolId, bool allowed);
    event RouterAllowed(address indexed router, bool allowed);
    event RouterQuoteConsumptionTrustSet(address indexed router, bool trusted);
    event RequireHookDataForSwapSet(bool required);
    event EnforceSingleUseQuoteSet(bool enabled);
    event TimeSwapObserved(
        PoolId indexed poolId, address indexed router, address indexed buyer, bytes32 quoteId
    );

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(IPoolManager _poolManager, IBookingManager _booking, address _owner)
        BaseHook(_poolManager)
    {
        if (address(_booking) == address(0)) revert MissingBookingManager();
        if (_owner == address(0)) revert MissingOwner();

        booking = _booking;
        owner = _owner;
        enforceSingleUseQuote = true;
    }

    function setAllowedPool(PoolKey calldata key, bool allowed) external onlyOwner {
        PoolId poolId = key.toId();
        allowedPool[poolId] = allowed;

        emit PoolAllowed(poolId, allowed);
    }

    function setAllowedRouter(address router, bool allowed) external onlyOwner {
        allowedRouter[router] = allowed;

        emit RouterAllowed(router, allowed);
    }

    function setRouterQuoteConsumptionTrust(address router, bool trusted) external onlyOwner {
        routerCanConsumeQuotes[router] = trusted;
        emit RouterQuoteConsumptionTrustSet(router, trusted);
    }

    function setRequireHookDataForSwap(bool required) external onlyOwner {
        requireHookDataForSwap = required;
        emit RequireHookDataForSwapSet(required);
    }

    function setEnforceSingleUseQuote(bool enabled) external onlyOwner {
        enforceSingleUseQuote = enabled;
        emit EnforceSingleUseQuoteSet(enabled);
    }

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    function _beforeSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata,
        bytes calldata hookData
    ) internal override returns (bytes4, BeforeSwapDelta, uint24) {
        _validatePoolAndRouter(key, sender);

        if (hookData.length == 0) {
            if (requireHookDataForSwap) revert MissingHookData();
        } else {
            HookData memory data = _validateHookDataAndReturn(hookData);
            if (enforceSingleUseQuote) {
                if (!routerCanConsumeQuotes[sender]) {
                    revert RouterNotTrustedForQuoteConsumption();
                }
                if (consumedHookQuote[data.quoteId]) revert QuoteAlreadyConsumed();
                consumedHookQuote[data.quoteId] = true;
            }
        }

        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    function _afterSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata,
        BalanceDelta,
        bytes calldata hookData
    ) internal override returns (bytes4, int128) {
        _validatePoolAndRouter(key, sender);

        address buyer;
        bytes32 quoteId;
        if (hookData.length > 0) {
            HookData memory data = abi.decode(hookData, (HookData));
            buyer = data.buyer;
            quoteId = data.quoteId;
        }

        emit TimeSwapObserved(key.toId(), sender, buyer, quoteId);

        return (BaseHook.afterSwap.selector, 0);
    }

    function _validatePoolAndRouter(PoolKey calldata key, address router) private view {
        if (!allowedPool[key.toId()]) revert PoolNotAllowed();
        if (!allowedRouter[router]) revert RouterNotAllowed();
    }

    function _validateHookDataAndReturn(bytes calldata hookData) private view returns (HookData memory data) {
        data = abi.decode(hookData, (HookData));
        if (data.buyer == address(0)) revert MissingBuyer();
        if (data.hoursWad == 0) revert InvalidHours();
        if (booking.availableHours(data.providerId) < data.hoursWad) {
            revert InsufficientInventory();
        }
        if (
            !booking.isQuoteValid(
                data.quoteId,
                data.buyer,
                data.providerId,
                data.hoursWad,
                data.slotId,
                data.expiresAt,
                data.nonce,
                data.signature
            )
        ) {
            revert InvalidQuote();
        }
    }
}
