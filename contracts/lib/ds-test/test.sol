// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

abstract contract DSTest {
    event log(string);
    event logs(bytes);
    event log_address(address);
    event log_bytes32(bytes32);
    event log_int(int256);
    event log_uint(uint256);
    event log_bytes(bytes);
    event log_string(string);
    event log_named_address(string key, address val);
    event log_named_bytes32(string key, bytes32 val);
    event log_named_decimal_int(string key, int256 val, uint256 decimals);
    event log_named_decimal_uint(string key, uint256 val, uint256 decimals);
    event log_named_int(string key, int256 val);
    event log_named_uint(string key, uint256 val);
    event log_named_bytes(string key, bytes val);
    event log_named_string(string key, string val);

    bool public IS_TEST = true;

    function fail() internal virtual {
        require(false, "DSTest fail");
    }

    function assertTrue(bool condition) internal virtual {
        if (!condition) fail();
    }

    function assertTrue(bool condition, string memory message) internal virtual {
        if (!condition) {
            emit log_named_string("Error", message);
            fail();
        }
    }

    function assertEq(uint256 a, uint256 b) internal virtual {
        if (a != b) {
            emit log_named_uint("  Expected", b);
            emit log_named_uint("    Actual", a);
            fail();
        }
    }

    function assertEq(uint256 a, uint256 b, string memory message) internal virtual {
        if (a != b) {
            emit log_named_string("Error", message);
            assertEq(a, b);
        }
    }

    function assertEq(int256 a, int256 b) internal virtual {
        if (a != b) {
            emit log_named_int("  Expected", b);
            emit log_named_int("    Actual", a);
            fail();
        }
    }

    function assertEq(address a, address b) internal virtual {
        if (a != b) {
            emit log_named_address("  Expected", b);
            emit log_named_address("    Actual", a);
            fail();
        }
    }

    function assertEq(bytes32 a, bytes32 b) internal virtual {
        if (a != b) {
            emit log_named_bytes32("  Expected", b);
            emit log_named_bytes32("    Actual", a);
            fail();
        }
    }

    function assertEq0(bytes memory a, bytes memory b) internal virtual {
        if (keccak256(a) != keccak256(b)) fail();
    }

    function assertEq0(bytes memory a, bytes memory b, string memory message) internal virtual {
        if (keccak256(a) != keccak256(b)) {
            emit log_named_string("Error", message);
            fail();
        }
    }
}
