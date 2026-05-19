// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
import {PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";

import {BookingManager} from "../src/BookingManager.sol";
import {IBookingManager} from "../src/interfaces/IBookingManager.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {TimeCreditToken} from "../src/TimeCreditToken.sol";
import {TimePoolHook} from "../src/TimePoolHook.sol";

interface VmEnv {
    function envUint(string calldata name) external returns (uint256 value);
    function envAddress(string calldata name) external returns (address value);
    function envOr(string calldata name, address defaultValue) external returns (address value);
    function addr(uint256 privateKey) external returns (address keyAddr);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

contract DeployTimeV4Testnet is Script {
    using CurrencyLibrary for Currency;
    using PoolIdLibrary for PoolKey;

    uint256 internal constant MAX_TIME_SUPPLY = 10_000_000 ether;
    uint24 internal constant POOL_FEE = 3_000;
    int24 internal constant TICK_SPACING = 60;
    uint160 internal constant SQRT_PRICE_1_1 = 79228162514264337593543950336;
    address internal constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    VmEnv internal constant vmx =
        VmEnv(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external {
        uint256 deployerPrivateKey = vmx.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vmx.addr(deployerPrivateKey);
        address quoteSigner = vmx.envOr("QUOTE_SIGNER_ADDRESS", deployer);
        address universalRouter = vmx.envAddress("V4_UNIVERSAL_ROUTER");
        IPoolManager poolManager = IPoolManager(vmx.envAddress("V4_POOL_MANAGER"));

        vmx.startBroadcast(deployerPrivateKey);

        address usdc = vmx.envOr("TEST_USDC", address(0));
        if (usdc == address(0)) {
            usdc = address(new MockUSDC());
        }

        TimeCreditToken timeToken = new TimeCreditToken(deployer, MAX_TIME_SUPPLY);
        BookingManager bookingManager = new BookingManager(timeToken, deployer);

        uint160 flags = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG);
        bytes memory constructorArgs = abi.encode(poolManager, bookingManager, deployer);
        (address minedHookAddress, bytes32 salt) = HookMiner.find(
            CREATE2_DEPLOYER,
            flags,
            type(TimePoolHook).creationCode,
            constructorArgs
        );

        IBookingManager booking = IBookingManager(address(bookingManager));
        TimePoolHook hook = new TimePoolHook{salt: salt}(poolManager, booking, deployer);
        require(address(hook) == minedHookAddress, "hook address mismatch");

        timeToken.grantRole(timeToken.BOOKING_ROLE(), address(bookingManager));
        bookingManager.grantRole(bookingManager.QUOTE_SIGNER_ROLE(), quoteSigner);
        hook.setAllowedRouter(universalRouter, true);
        hook.setRouterQuoteConsumptionTrust(universalRouter, true);

        PoolKey memory key = _poolKey(address(timeToken), usdc, address(hook));
        poolManager.initialize(key, SQRT_PRICE_1_1);
        hook.setAllowedPool(key, true);

        vmx.stopBroadcast();

        console2.log("TIME_TOKEN_TESTNET", address(timeToken));
        console2.log("BOOKING_MANAGER_TESTNET", address(bookingManager));
        console2.log("TIME_POOL_HOOK_TESTNET", address(hook));
        console2.log("TEST_USDC", usdc);
        console2.log("V4_POOL_MANAGER", address(poolManager));
        console2.log("V4_UNIVERSAL_ROUTER", universalRouter);
        console2.log(
            "V4_POSITION_MANAGER", vmx.envAddress("V4_POSITION_MANAGER")
        );
        console2.log("V4_STATE_VIEW", vmx.envAddress("V4_STATE_VIEW"));
        console2.log("V4_QUOTER", vmx.envAddress("V4_QUOTER"));
        console2.log("V4_PERMIT2", vmx.envAddress("V4_PERMIT2"));
        console2.log("V4_POOL_ID");
        console2.logBytes32(PoolId.unwrap(key.toId()));
        console2.log("POOL_CURRENCY0", Currency.unwrap(key.currency0));
        console2.log("POOL_CURRENCY1", Currency.unwrap(key.currency1));
        console2.log("POOL_FEE", key.fee);
        console2.logInt(key.tickSpacing);
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
