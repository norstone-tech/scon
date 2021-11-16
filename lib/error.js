/**
 * Swift-Cardinal Object Notation
 * https://github.com/norstone-tech/scon
 *
 * Copyright (c) BlueStone Technological Enterprises Inc., 2016-2019
 * Copyright (c) Norstone Technologies 2021
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

/**
 * All errors thrown by this library is an instance of this
 */
class SconError extends Error {}
SconError.prototype.name = "SconError";

/**
 * @extends SconError
 * All errors thrown when parsing is an instance of this
 */
class SconParseError extends SconError {}
SconParseError.prototype.name = "SconParseError";

/**
 * @extends SconParseError
 * Thrown if the SCON3 file identifier isn't present
 */
class SconMagicNumberError extends SconParseError {
	constructor(msg = "Data wasn't SCON3 data (magic number mismatch)"){
		super(msg);
	}
}
SconMagicNumberError.prototype.name = "SconMagicNumberError";

/**
 * @extends SconParseError
 * Throws if the SCON data is shorter than expected. e.g. if the data ends before a string terminates
 */
class SconTruncateError extends SconParseError {
	constructor(msg = "The SCON data ends unexpectedly"){
		super(msg);
	}
}
SconTruncateError.prototype.name = "SconTruncateError";

/**
 * @extends SconParseError
 * Thrown when a reference points to an undefined value, or if the referenced type doesn't match what is expected
 */
class SconReferenceError extends SconParseError {
	constructor(msg = "The SCON data has a undefined reference!"){
		super(msg);
	}
}
SconReferenceError.prototype.name = "SconReferenceError";

/**
 * @extends SconError
 * All errors thrown when encoding is an instance of this
 */
class SconSerializeError extends SconError {}
SconSerializeError.prototype.name = "SconSerializeError";

/**
 * @extends SconSerializeError
 * Throws when encountering an value which cannot be serialized
 */
class SconUnserializableError extends SconSerializeError {
	constructor(/* istanbul ignore next */ msg = "Cannot serialize"){
		super(msg);
	}
}
SconUnserializableError.prototype.name = "SconUnserializableError";
/**
 * @extends SconSerializeError
 * Throws if a property name is invalid, e.g. contains null bytes
 */
class SconInvalidKeyError extends SconSerializeError {
	constructor(/* istanbul ignore next */ msg = "Property name is invalid"){
		super(msg);
	}
}
SconInvalidKeyError.prototype.name = "SconInvalidKeyError";

module.exports = {
	SconError,
	SconInvalidKeyError,
	SconMagicNumberError,
	SconParseError,
	SconReferenceError,
	SconSerializeError,
	SconTruncateError,
	SconUnserializableError
};
