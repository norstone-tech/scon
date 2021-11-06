/**
 * Swift-Cardinal Object Notation
 * https://github.com/norstone-tech/scon
 *
 * Copyright (c) BlueStone Technological Enterprises Inc., 2016-2019
 * Copyright (c) Norstone Technologies 2021
 * Licensed under the GNU GPLv3 license.
 */

"use strict";
const MAGIC_NUMBER = Buffer.from([ 7, 83, 67, 51 ]);
const BASE_TYPES = {
	EOF: 0,
	NULL: 1 << 5,
	BOOLEAN: 2 << 5,
	FLOAT_FIXED: 3 << 5,
	INT_VAR: 4 << 5,
	STRING_ZERO_TERM: 5 << 5,
	STRING_LENGTH_PREFIXED: 6 << 5,
	OBJECT: 7 << 5
};
const HEADER_BYTE = {
	BASE_TYPES: 0b11100000,
	BASE_TYPE_VARIANT: 0b00010000,
	HAS_EXTENDED_TYPE: 0b00001000,
	IS_REFERENCE_DEFINITION: 0b00000100,
	KEY_IS_REFERENCE: 0b00000010,
	KEY_IS_REFERENCE_SLOT: 0b00000010, // only relevent when IS_REFERENCE_DEFINITION
	// Both of the above means parse the key as a varint instead of a null-terminated string
	VALUE_IS_REFERENCE: 0b00000001
}
const EXTENDED_TYPES = {
	INT_VAR: {
		FLOAT_64_SAFE_INT: 0,
		UINT8: 2,
		SINT8: 3,
		UINT16: 4,
		SINT16: 5,
		UINT32: 6,
		SINT32: 7,
		UINT64: 8,
		SINT64: 9,
		UINT128: 10,
		SINT128: 11,
		UINT256: 12,
		SINT256: 13,
		INF_INT: 16, // Default
		DATE_S: 32,
		DATE_MS: 33
	},
	OBJECT: {
		// Parsing variant 0
		OBJECT: 0,
		STRING_KEY_MAP_ALT: 1,
		STRING_KEY_MAP: 2,
		// Parsing variant 1
		ARRAY: 0,
		SET: 1,
		ANY_KEY_MAP: 2
	}
};
const VARINT_RAGES = {
	FLOAT_64_SAFE_INT: {
		MIN_VALUE: BigInt(Number.MIN_SAFE_INTEGER),
		MAX_VALUE: BigInt(Number.MAX_SAFE_INTEGER)
	},
	UINT8: {
		MIN_VALUE: 0n,
		MAX_VALUE: 2n ** 8n - 1n
	},
	SINT8: {
		MIN_VALUE: (-2n) ** 7n,
		MAX_VALUE: 2n ** 7n - 1n
	},
	UINT16: {
		MIN_VALUE: 0n,
		MAX_VALUE: 2n ** 16n - 1n
	},
	SINT16: {
		MIN_VALUE: (-2n) ** 15n,
		MAX_VALUE: 2n ** 15n - 1n
	},
	UINT32: {
		MIN_VALUE: 0n,
		MAX_VALUE: 2n ** 32n - 1n
	},
	SINT32: {
		MIN_VALUE: (-2n) ** 31n,
		MAX_VALUE: 2n ** 31n - 1n
	},
	UINT64: {
		MIN_VALUE: 0n,
		MAX_VALUE: 2n ** 64n - 1n
	},
	SINT64: {
		MIN_VALUE: (-2n) ** 63n,
		MAX_VALUE: 2n ** 63n - 1n
	},
	UINT128: {
		MIN_VALUE: 0n,
		MAX_VALUE: 2n ** 128n - 1n
	},
	SINT128: {
		MIN_VALUE: (-2n) ** 127n,
		MAX_VALUE: 2n ** 127n - 1n
	},
	UINT256: {
		MIN_VALUE: 0n,
		MAX_VALUE: 2n ** 256n - 1n
	},
	SINT256: {
		MIN_VALUE: (-2n) ** 255n,
		MAX_VALUE: 2n ** 255n - 1n
	}
};

module.exports = {
	MAGIC_NUMBER,
	BASE_TYPES,
	HEADER_BYTE,
	EXTENDED_TYPES,
	EXTENDED_TYPE_USER: 0b10000000,
	VARINT_EXTEND: 0b10000000,
	VARINT_VALUE: 0b01111111,
	VARINT_RAGES
};
