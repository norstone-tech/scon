/**
 * Swift-Cardinal Object Notation
 * https://github.com/BlueStone-Tech-Enterprises/scon/
 *
 * Copyright (c) BlueStone Technological Enterprises Inc., 2016-2017
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

const sconError = {};

sconError.errorCodes = {};
sconError.errorMesages = [];

sconError.defineError = function(errorName, errorCode, errorMessage){
	sconError.errorCodes[errorName] = errorCode;
	sconError.errorMesages[errorCode] = errorMessage;
};

class SconError extends Error {
	constructor(errorCode, details){
		let msg;
		if(typeof errorCode === "string"){
			msg = sconError.errorMesages[sconError.errorCodes[errorCode]];
		}else{
			msg = sconError.errorMesages[errorCode];
		}
		if(details){
			msg += " (" + details + ")";
		}
		super(msg);
		this.name = "SconError";
	}
}

sconError.Error = SconError;
sconError.Exception = SconError;

/**
 *******************************************
 *
 * Error definitions
 *
 *******************************************
 */


sconError.defineError("noMagicNumber", 0, "Not SCON data (invalid magic number)");
sconError.defineError("unknownObjectType", 1, "The data contains an unknown object type!");
sconError.defineError("endOfFileTooSoon", 2, "The scon data ends unexpectedly");
sconError.defineError("invalidKey", 3, "The value key is invalid");
sconError.defineError("undefinedKey", 4, "An object's property name is undefined");

module.exports = sconError;
