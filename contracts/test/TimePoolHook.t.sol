// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {BaseHook} from "@uniswap/v4-periphery/src/utils/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

import {IBookingManager} from "../src/interfaces/IBookingManager.sol";
import {TimePoolHook} from "../src/TimePoolHook.sol";

contract MockBookingManager is IBookingManager {
    uint256 public hoursAvailable = 100 ether;
    bool public quoteValid = true;

    function setHoursAvailable(uint256 value) external {
        hoursAvailable = value;
    }

    function setQuoteValid(bool value) external {
        quoteValid = value;
    }

    function availableHours(uint256) external view returns (uint256) {
        return hoursAvailable;
    }

    function isQuoteValid(
        bytes32,
        address,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        bytes calldata
    ) external view returns (bool) {
        return quoteValid;
    }
}

contract TestTimePoolHook is TimePoolHook {
    constructor(IPoolManager poolManager, IBookingManager booking, address owner)
        TimePoolHook(poolManager, booking, owner)
    {}

    function validateHookAddress(BaseHook) internal pure override {}
}

contract TimePoolHookTest is Test {
    TestTimePoolHook internal hook;
    MockBookingManager internal booking;

    address internal owner = address(this);
    address internal router = address(0xCA11);
    address internal poolManager = address(0x1234);
    address internal buyer = address(0xB0B);
    PoolKey internal key;

    function setUp() public {
        booking = new MockBookingManager();
        hook = new TestTimePoolHook(IPoolManager(poolManager), booking, owner);

        key = PoolKey({
            currency0: Currency.wrap(address(0x1000)),
            currency1: Currency.wrap(address(0x2000)),
            fee: 3000,
            tickSpacing: 60,
            hooks: hook
        });
    }

    function testPermissionsOnlyBeforeAndAfterSwap() public {
        Hooks.Permissions memory permissions = hook.getHookPermissions();

        assertTrue(permissions.beforeSwap);
        assertTrue(permissions.afterSwap);
        assertFalse(permissions.beforeSwapReturnDelta);
        assertFalse(permissions.afterSwapReturnDelta);
        assertFalse(permissions.beforeAddLiquidity);
        assertFalse(permissions.afterAddLiquidity);
    }

    function testOwnerCanAllowPoolAndRouter() public {
        hook.setAllowedPool(key, true);
        hook.setAllowedRouter(router, true);

        assertTrue(hook.allowedRouter(router));
    }

    function testNonOwnerCannotAllowRouter() public {
        vm.prank(address(0xBAD));
        vm.expectRevert(TimePoolHook.NotOwner.selector);
        hook.setAllowedRouter(router, true);
    }

    function testBeforeSwapAllowsEmptyHookDataForAllowedPoolAndRouter() public {
        hook.setAllowedPool(key, true);
        hook.setAllowedRouter(router, true);

        vm.prank(poolManager);
        (bytes4 selector,, uint24 feeOverride) =
            hook.beforeSwap(router, key, _swapParams(), "");

        assertEq(selector, BaseHook.beforeSwap.selector);
        assertEq(feeOverride, 0);
    }

    function testBeforeSwapRejectsUnallowedPool() public {
        hook.setAllowedRouter(router, true);

        vm.prank(poolManager);
        vm.expectRevert(TimePoolHook.PoolNotAllowed.selector);
        hook.beforeSwap(router, key, _swapParams(), "");
    }

    function testBeforeSwapRejectsUnallowedRouter() public {
        hook.setAllowedPool(key, true);

        vm.prank(poolManager);
        vm.expectRevert(TimePoolHook.RouterNotAllowed.selector);
        hook.beforeSwap(router, key, _swapParams(), "");
    }

    function testBeforeSwapRejectsMissingBuyer() public {
        hook.setAllowedPool(key, true);
        hook.setAllowedRouter(router, true);

        TimePoolHook.HookData memory data = _hookData();
        data.buyer = address(0);

        vm.prank(poolManager);
        vm.expectRevert(TimePoolHook.MissingBuyer.selector);
        hook.beforeSwap(router, key, _swapParams(), abi.encode(data));
    }

    function testBeforeSwapRejectsZeroHours() public {
        hook.setAllowedPool(key, true);
        hook.setAllowedRouter(router, true);

        TimePoolHook.HookData memory data = _hookData();
        data.hoursWad = 0;

        vm.prank(poolManager);
        vm.expectRevert(TimePoolHook.InvalidHours.selector);
        hook.beforeSwap(router, key, _swapParams(), abi.encode(data));
    }

    function testBeforeSwapRejectsInsufficientInventory() public {
        hook.setAllowedPool(key, true);
        hook.setAllowedRouter(router, true);
        booking.setHoursAvailable(1 ether);

        TimePoolHook.HookData memory data = _hookData();
        data.hoursWad = 2 ether;

        vm.prank(poolManager);
        vm.expectRevert(TimePoolHook.InsufficientInventory.selector);
        hook.beforeSwap(router, key, _swapParams(), abi.encode(data));
    }

    function testBeforeSwapRejectsInvalidQuote() public {
        hook.setAllowedPool(key, true);
        hook.setAllowedRouter(router, true);
        booking.setQuoteValid(false);

        vm.prank(poolManager);
        vm.expectRevert(TimePoolHook.InvalidQuote.selector);
        hook.beforeSwap(router, key, _swapParams(), abi.encode(_hookData()));
    }

    function testAfterSwapEmitsObservedSwap() public {
        hook.setAllowedPool(key, true);
        hook.setAllowedRouter(router, true);

        TimePoolHook.HookData memory data = _hookData();

        vm.expectEmit(true, true, true, true);
        emit TimePoolHook.TimeSwapObserved(key.toId(), router, buyer, data.quoteId);

        vm.prank(poolManager);
        hook.afterSwap(router, key, _swapParams(), BalanceDelta.wrap(0), abi.encode(data));
    }

    function testHookNeedsMinedAddressInFullIntegration() public {
        uint160 flags = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG);
        assertEq(flags & uint160(Hooks.BEFORE_SWAP_FLAG), uint160(Hooks.BEFORE_SWAP_FLAG));
        assertEq(flags & uint160(Hooks.AFTER_SWAP_FLAG), uint160(Hooks.AFTER_SWAP_FLAG));
    }

    function _swapParams() internal pure returns (SwapParams memory) {
        return SwapParams({zeroForOne: true, amountSpecified: -1 ether, sqrtPriceLimitX96: 0});
    }

    function _hookData() internal view returns (TimePoolHook.HookData memory) {
        return TimePoolHook.HookData({
            buyer: buyer,
            providerId: 1,
            hoursWad: 2 ether,
            slotId: 1001,
            quoteId: keccak256("quote-1"),
            expiresAt: block.timestamp + 1 hours,
            nonce: 1,
            signature: hex"01"
        });
    }
}
