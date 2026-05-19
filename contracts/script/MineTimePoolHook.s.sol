// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";

import {IBookingManager} from "../src/interfaces/IBookingManager.sol";
import {TimePoolHook} from "../src/TimePoolHook.sol";

interface VmEnv {
    function envAddress(string calldata name) external returns (address value);
}

contract MineTimePoolHook is Script {
    address internal constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    VmEnv internal constant vmx =
        VmEnv(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run()
        external
        returns (address hookAddress, bytes32 salt)
    {
        IPoolManager poolManager = IPoolManager(vmx.envAddress("V4_POOL_MANAGER"));
        IBookingManager booking = IBookingManager(vmx.envAddress("BOOKING_MANAGER_TESTNET"));
        address owner = vmx.envAddress("HOOK_OWNER");

        uint160 flags = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG);
        bytes memory constructorArgs = abi.encode(poolManager, booking, owner);

        (hookAddress, salt) = HookMiner.find(
            CREATE2_DEPLOYER,
            flags,
            type(TimePoolHook).creationCode,
            constructorArgs
        );
    }
}
