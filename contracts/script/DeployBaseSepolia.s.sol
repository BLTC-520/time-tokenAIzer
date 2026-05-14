// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";

import {BookingManager} from "../src/BookingManager.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {TimeCreditToken} from "../src/TimeCreditToken.sol";
import {TimePoolHook} from "../src/TimePoolHook.sol";

contract DeployBaseSepolia is Script {
    using CurrencyLibrary for Currency;

    uint256 internal constant MAX_TIME_SUPPLY = 10_000_000 ether;
    uint24 internal constant POOL_FEE = 3_000;
    int24 internal constant TICK_SPACING = 60;
    uint160 internal constant SQRT_PRICE_1_1 = 79228162514264337593543950336;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address quoteSigner = vm.envOr("QUOTE_SIGNER_ADDRESS", deployer);
        address universalRouter = vm.envAddress("BASE_SEPOLIA_UNIVERSAL_ROUTER");
        IPoolManager poolManager = IPoolManager(vm.envAddress("BASE_SEPOLIA_POOL_MANAGER"));

        vm.startBroadcast(deployerPrivateKey);

        address configuredUsdc = vm.envOr("USDC_BASE_SEPOLIA", address(0));
        MockUSDC mockUsdc;
        address usdc;
        if (configuredUsdc == address(0)) {
            mockUsdc = new MockUSDC();
            usdc = address(mockUsdc);
        } else {
            usdc = configuredUsdc;
        }

        TimeCreditToken timeToken = new TimeCreditToken(deployer, MAX_TIME_SUPPLY);
        BookingManager bookingManager = new BookingManager(timeToken, deployer);

        uint160 flags = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG);
        bytes memory constructorArgs = abi.encode(poolManager, bookingManager, deployer);
        (address minedHookAddress, bytes32 salt) = HookMiner.find(
            deployer,
            flags,
            type(TimePoolHook).creationCode,
            constructorArgs
        );

        TimePoolHook hook = new TimePoolHook{salt: salt}(poolManager, bookingManager, deployer);
        require(address(hook) == minedHookAddress, "hook address mismatch");

        timeToken.grantRole(timeToken.BOOKING_ROLE(), address(bookingManager));
        bookingManager.grantRole(bookingManager.QUOTE_SIGNER_ROLE(), quoteSigner);
        hook.setAllowedRouter(universalRouter, true);

        PoolKey memory key = _poolKey(address(timeToken), usdc, address(hook));
        poolManager.initialize(key, SQRT_PRICE_1_1);
        hook.setAllowedPool(key, true);

        vm.stopBroadcast();
    }

    function _poolKey(address timeToken, address usdc, address hook)
        internal
        pure
        returns (PoolKey memory)
    {
        Currency currencyA = Currency.wrap(timeToken);
        Currency currencyB = Currency.wrap(usdc);

        (Currency currency0, Currency currency1) =
            Currency.unwrap(currencyA) < Currency.unwrap(currencyB)
                ? (currencyA, currencyB)
                : (currencyB, currencyA);

        return PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: POOL_FEE,
            tickSpacing: TICK_SPACING,
            hooks: TimePoolHook(hook)
        });
    }
}
