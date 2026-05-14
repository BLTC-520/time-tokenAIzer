// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";

import {IBookingManager} from "../src/interfaces/IBookingManager.sol";
import {TimePoolHook} from "../src/TimePoolHook.sol";

contract MineTimePoolHook is Script {
    function run()
        external
        view
        returns (address hookAddress, bytes32 salt)
    {
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        IPoolManager poolManager = IPoolManager(vm.envAddress("BASE_SEPOLIA_POOL_MANAGER"));
        IBookingManager booking = IBookingManager(vm.envAddress("BOOKING_MANAGER_BASE_SEPOLIA"));
        address owner = vm.envAddress("HOOK_OWNER");

        uint160 flags = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG);
        bytes memory constructorArgs = abi.encode(poolManager, booking, owner);

        (hookAddress, salt) = HookMiner.find(
            deployer,
            flags,
            type(TimePoolHook).creationCode,
            constructorArgs
        );
    }
}
