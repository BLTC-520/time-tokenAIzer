// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract TimeCreditToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BOOKING_ROLE = keccak256("BOOKING_ROLE");

    uint256 public immutable maxSupply;

    error InvalidAdmin();
    error MaxSupplyExceeded();

    constructor(address admin, uint256 _maxSupply) ERC20("Time Credit", "TIME") {
        if (admin == address(0)) revert InvalidAdmin();

        maxSupply = _maxSupply;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (totalSupply() + amount > maxSupply) revert MaxSupplyExceeded();
        _mint(to, amount);
    }

    function burnFromBooking(address account, uint256 amount) external onlyRole(BOOKING_ROLE) {
        _burn(account, amount);
    }
}
