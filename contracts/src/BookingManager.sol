// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {TimeCreditToken} from "./TimeCreditToken.sol";

contract BookingManager is AccessControl, EIP712, ReentrancyGuard {
    bytes32 public constant QUOTE_SIGNER_ROLE = keccak256("QUOTE_SIGNER_ROLE");
    bytes32 public constant PROVIDER_MANAGER_ROLE = keccak256("PROVIDER_MANAGER_ROLE");
    bytes32 public constant QUOTE_TYPEHASH = keccak256(
        "BookingQuote(bytes32 quoteId,address buyer,uint256 providerId,uint256 hoursWad,uint256 slotId,uint256 expiresAt,uint256 nonce)"
    );

    enum BookingStatus {
        None,
        Booked,
        Completed,
        Cancelled,
        Disputed
    }

    struct Provider {
        address owner;
        uint256 availableHoursWad;
        bool paused;
    }

    struct Booking {
        address buyer;
        uint256 providerId;
        uint256 hoursWad;
        uint256 slotId;
        BookingStatus status;
    }

    struct BookingQuote {
        bytes32 quoteId;
        address buyer;
        uint256 providerId;
        uint256 hoursWad;
        uint256 slotId;
        uint256 expiresAt;
        uint256 nonce;
        bytes signature;
    }

    TimeCreditToken public immutable timeToken;

    uint256 public nextProviderId = 1;
    uint256 public nextBookingId = 1;

    mapping(uint256 providerId => Provider provider) public providers;
    mapping(uint256 bookingId => Booking booking) public bookings;
    mapping(uint256 providerId => mapping(uint256 slotId => bool taken)) public slotTaken;
    mapping(bytes32 quoteId => bool used) public usedQuotes;

    error InvalidProviderOwner();
    error MissingTimeToken();
    error InvalidAdmin();
    error UnknownProvider();
    error ProviderPaused();
    error InsufficientInventory();
    error SlotTaken();
    error QuoteExpired();
    error QuoteAlreadyUsed();
    error InvalidQuote();
    error InvalidBuyer();
    error InvalidHours();
    error NotProviderOwner();
    error NotBookingParticipant();
    error InvalidBookingStatus();

    event ProviderRegistered(
        uint256 indexed providerId, address indexed owner, uint256 hoursWad
    );
    event ProviderInventoryUpdated(uint256 indexed providerId, uint256 hoursWad, bool paused);
    event Booked(
        uint256 indexed bookingId,
        address indexed buyer,
        uint256 indexed providerId,
        uint256 slotId,
        uint256 hoursWad
    );
    event BookingCompleted(uint256 indexed bookingId);

    constructor(TimeCreditToken _timeToken, address admin) EIP712("TimeTokenAIzerBooking", "1") {
        if (address(_timeToken) == address(0)) revert MissingTimeToken();
        if (admin == address(0)) revert InvalidAdmin();

        timeToken = _timeToken;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(QUOTE_SIGNER_ROLE, admin);
        _grantRole(PROVIDER_MANAGER_ROLE, admin);
    }

    function registerProvider(address owner, uint256 hoursWad)
        external
        onlyRole(PROVIDER_MANAGER_ROLE)
        returns (uint256 providerId)
    {
        if (owner == address(0)) revert InvalidProviderOwner();

        providerId = nextProviderId++;
        providers[providerId] =
            Provider({owner: owner, availableHoursWad: hoursWad, paused: false});

        emit ProviderRegistered(providerId, owner, hoursWad);
    }

    function setProviderInventory(uint256 providerId, uint256 hoursWad, bool paused) external {
        Provider storage provider = providers[providerId];
        if (provider.owner == address(0)) revert UnknownProvider();
        if (msg.sender != provider.owner && !hasRole(PROVIDER_MANAGER_ROLE, msg.sender)) {
            revert NotProviderOwner();
        }

        provider.availableHoursWad = hoursWad;
        provider.paused = paused;

        emit ProviderInventoryUpdated(providerId, hoursWad, paused);
    }

    function availableHours(uint256 providerId) external view returns (uint256) {
        return providers[providerId].availableHoursWad;
    }

    function isQuoteValid(
        bytes32 quoteId,
        address buyer,
        uint256 providerId,
        uint256 hoursWad,
        uint256 slotId,
        uint256 expiresAt,
        uint256 nonce,
        bytes calldata signature
    ) public view returns (bool) {
        if (quoteId == bytes32(0) || usedQuotes[quoteId] || block.timestamp > expiresAt) {
            return false;
        }
        if (buyer == address(0) || hoursWad == 0) return false;

        Provider memory provider = providers[providerId];
        if (
            provider.owner == address(0) || provider.paused
                || provider.availableHoursWad < hoursWad || slotTaken[providerId][slotId]
        ) {
            return false;
        }

        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    QUOTE_TYPEHASH, quoteId, buyer, providerId, hoursWad, slotId, expiresAt, nonce
                )
            )
        );
        (address signer, ECDSA.RecoverError errorCode,) = ECDSA.tryRecover(digest, signature);

        return errorCode == ECDSA.RecoverError.NoError && hasRole(QUOTE_SIGNER_ROLE, signer);
    }

    function bookWithCredits(BookingQuote calldata quote)
        external
        nonReentrant
        returns (uint256 bookingId)
    {
        if (quote.buyer != msg.sender) revert InvalidBuyer();
        if (quote.hoursWad == 0) revert InvalidHours();
        if (usedQuotes[quote.quoteId]) revert QuoteAlreadyUsed();
        if (block.timestamp > quote.expiresAt) revert QuoteExpired();

        Provider storage provider = providers[quote.providerId];
        if (provider.owner == address(0)) revert UnknownProvider();
        if (provider.paused) revert ProviderPaused();
        if (provider.availableHoursWad < quote.hoursWad) revert InsufficientInventory();
        if (slotTaken[quote.providerId][quote.slotId]) revert SlotTaken();

        if (
            !isQuoteValid(
                quote.quoteId,
                quote.buyer,
                quote.providerId,
                quote.hoursWad,
                quote.slotId,
                quote.expiresAt,
                quote.nonce,
                quote.signature
            )
        ) {
            revert InvalidQuote();
        }

        usedQuotes[quote.quoteId] = true;
        provider.availableHoursWad -= quote.hoursWad;
        slotTaken[quote.providerId][quote.slotId] = true;
        timeToken.burnFromBooking(msg.sender, quote.hoursWad);

        bookingId = nextBookingId++;
        bookings[bookingId] = Booking({
            buyer: msg.sender,
            providerId: quote.providerId,
            hoursWad: quote.hoursWad,
            slotId: quote.slotId,
            status: BookingStatus.Booked
        });

        emit Booked(bookingId, msg.sender, quote.providerId, quote.slotId, quote.hoursWad);
    }

    function completeBooking(uint256 bookingId) external {
        Booking storage booking = bookings[bookingId];
        if (booking.status != BookingStatus.Booked) revert InvalidBookingStatus();

        Provider memory provider = providers[booking.providerId];
        if (
            msg.sender != booking.buyer && msg.sender != provider.owner
                && !hasRole(PROVIDER_MANAGER_ROLE, msg.sender)
        ) {
            revert NotBookingParticipant();
        }

        booking.status = BookingStatus.Completed;

        emit BookingCompleted(bookingId);
    }
}
