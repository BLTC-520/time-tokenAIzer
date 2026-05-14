// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";

import {TimeCreditToken} from "../src/TimeCreditToken.sol";

contract TimeCreditTokenTest is Test {
    TimeCreditToken internal timeToken;

    address internal admin = address(0xA11CE);
    address internal minter = address(0xB0B);
    address internal booking = address(0xB00C);
    address internal buyer = address(0xCAFE);

    function setUp() public {
        timeToken = new TimeCreditToken(admin, 100 ether);

        vm.startPrank(admin);
        timeToken.grantRole(timeToken.MINTER_ROLE(), minter);
        timeToken.grantRole(timeToken.BOOKING_ROLE(), booking);
        vm.stopPrank();
    }

    function testMinterCanMintWithinCap() public {
        vm.prank(minter);
        timeToken.mint(buyer, 10 ether);

        assertEq(timeToken.balanceOf(buyer), 10 ether);
        assertEq(timeToken.totalSupply(), 10 ether);
    }

    function testMintRevertsAboveMaxSupply() public {
        vm.prank(minter);
        timeToken.mint(buyer, 100 ether);

        vm.prank(minter);
        vm.expectRevert(TimeCreditToken.MaxSupplyExceeded.selector);
        timeToken.mint(buyer, 1);
    }

    function testOnlyBookingRoleCanBurnFromBooking() public {
        vm.prank(minter);
        timeToken.mint(buyer, 10 ether);

        vm.prank(buyer);
        vm.expectRevert();
        timeToken.burnFromBooking(buyer, 1 ether);

        vm.prank(booking);
        timeToken.burnFromBooking(buyer, 4 ether);

        assertEq(timeToken.balanceOf(buyer), 6 ether);
    }
}
