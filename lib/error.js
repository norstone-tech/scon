/**
 * Swift Binary Tag
 * https://github.com/JamesxX/sbtag
 *
 * Copyright (c) 2016 James R Swift
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

var sbtagError = {}

sbtagError.errorCodes = {};
sbtagError.errorMesages = {};

sbtagError.defineError = function ( errorName, errorCode, errorMessage ){
	sbtagError.errorCodes[ errorName ] = errorCode;
	sbtagError.errorMesages[ errorCode ] = errorMessage;
}

sbtagError.Exception = function( errorCode ){
   this.message = sbtagError.errorMesages[ errorCode ];
   this.name = "sbtagException";
   this.code = errorCode;
}

/********************************************

			Error definitions

********************************************/


sbtagError.defineError( "noMagicNumber", 0, "The string provided did not have a matching magic number!" );

module.exports = sbtagError;