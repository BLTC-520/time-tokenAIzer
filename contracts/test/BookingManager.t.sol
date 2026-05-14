// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";

import {BookingManager} from "../src/BookingManager.sol";
import {TimeCreditToken} from "../src/TimeCreditToken.sol";

contract BookingManagerTest is Test {
    bytes32 internal constant EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    TimeCreditToken internal timeToken;
    BookingManager internal bookingManager;

    uint256 internal quoteSignerPrivateKey = 0xA11CE;
    address internal quoteSigner = vm.addr(quoteSignerPrivateKey);
    address internal admin = address(0xAD);
    address internal provider = address(0xBEEF);
    address internal buyer = address(0xCAFE);

    function setUp() public {
        timeToken = new TimeCreditToken(admin, 1_000 ether);
        bookingManager = new BookingManager(timeToken, admin);

        vm.startPrank(admin);
        timeToken.grantRole(timeToken.BOOKING_ROLE(), address(bookingManager));
        timeToken.mint(buyer, 100 ether);
        bookingManager.grantRole(bookingManager.QUOTE_SIGNER_ROLE(), quoteSigner);
        vm.stopPrank();
    }

    function testBookWithCreditsBurnsTimeAndLocksSlot() public {
        uint256 providerId = _registerProvider(40 ether);
        BookingManager.BookingQuote memory quote = _quote({
            quoteId: keccak256("quote-1"),
            buyer_: buyer,
            providerId_: providerId,
            hoursWad_: 20 ether,
            slotId_: 1001,
            expiresAt_: block.timestamp + 1 hours,
            nonce_: 1
        });

        vm.prank(buyer);
        uint256 bookingId = bookingManager.bookWithCredits(quote);

        assertEq(bookingId, 1);
        assertEq(timeToken.balanceOf(buyer), 80 ether);
        assertEq(bookingManager.availableHours(providerId), 20 ether);
        assertTrue(bookingManager.usedQuotes(quote.quoteId));
        assertTrue(bookingManager.slotTaken(providerId, quote.slotId));
    }

    function testCannotReuseQuote() public {
        uint256 providerId = _registerProvider(40 ether);
        BookingManager.BookingQuote memory quote = _quote({
            quoteId: keccak256("quote-reuse"),
            buyer_: buyer,
            providerId_: providerId,
            hoursWad_: 5 ether,
            slotId_: 2001,
            expiresAt_: block.timestamp + 1 hours,
            nonce_: 1
        });

        vm.startPrank(buyer);
        bookingManager.bookWithCredits(quote);
        vm.expectRevert(BookingManager.QuoteAlreadyUsed.selector);
        bookingManager.bookWithCredits(quote);
        vm.stopPrank();
    }

    function testCannotOverbookInventory() public {
        uint256 providerId = _registerProvider(4 ether);
        BookingManager.BookingQuote memory quote = _quote({
            quoteId: keccak256("quote-overbook"),
            buyer_: buyer,
            providerId_: providerId,
            hoursWad_: 5 ether,
            slotId_: 3001,
            expiresAt_: block.timestamp + 1 hours,
            nonce_: 1
        });

        vm.prank(buyer);
        vm.expectRevert(BookingManager.InsufficientInventory.selector);
        bookingManager.bookWithCredits(quote);
    }

    function testExpiredQuoteFails() public {
        uint256 providerId = _registerProvider(40 ether);
        BookingManager.BookingQuote memory quote = _quote({
            quoteId: keccak256("quote-expired"),
            buyer_: buyer,
            providerId_: providerId,
            hoursWad_: 5 ether,
            slotId_: 4001,
            expiresAt_: block.timestamp - 1,
            nonce_: 1
        });

        vm.prank(buyer);
        vm.expectRevert(BookingManager.QuoteExpired.selector);
        bookingManager.bookWithCredits(quote);
    }

    function testOnlyParticipantCanCompleteBooking() public {
        uint256 providerId = _registerProvider(40 ether);
        BookingManager.BookingQuote memory quote = _quote({
            quoteId: keccak256("quote-complete"),
            buyer_: buyer,
            providerId_: providerId,
            hoursWad_: 5 ether,
            slotId_: 5001,
            expiresAt_: block.timestamp + 1 hours,
            nonce_: 1
        });

        vm.prank(buyer);
        uint256 bookingId = bookingManager.bookWithCredits(quote);

        vm.prank(address(0xBAD));
        vm.expectRevert(BookingManager.NotBookingParticipant.selector);
        bookingManager.completeBooking(bookingId);

        vm.prank(provider);
        bookingManager.completeBooking(bookingId);
    }

    function _registerProvider(uint256 hoursWad) internal returns (uint256 providerId) {
        vm.prank(admin);
        providerId = bookingManager.registerProvider(provider, hoursWad);
    }

    function _quote(
        bytes32 quoteId,
        address buyer_,
        uint256 providerId_,
        uint256 hoursWad_,
        uint256 slotId_,
        uint256 expiresAt_,
        uint256 nonce_
    ) internal returns (BookingManager.BookingQuote memory quote) {
        bytes32 structHash = keccak256(
            abi.encode(
                bookingManager.QUOTE_TYPEHASH(),
                quoteId,
                buyer_,
                providerId_,
                hoursWad_,
                slotId_,
                expiresAt_,
                nonce_
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(quoteSignerPrivateKey, digest);

        quote = BookingManager.BookingQuote({
            quoteId: quoteId,
            buyer: buyer_,
            providerId: providerId_,
            hoursWad: hoursWad_,
            slotId: slotId_,
            expiresAt: expiresAt_,
            nonce: nonce_,
            signature: abi.encodePacked(r, s, v)
        });
    }

    function _domainSeparator() internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes("TimeTokenAIzerBooking")),
                keccak256(bytes("1")),
                block.chainid,
                address(bookingManager)
            )
        );
    }
}
