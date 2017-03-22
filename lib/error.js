/**
 * Swift-Cardinal Object Notation
 * https://github.com/BlueStone-Tech-Enterprises/scon/
 *
 * Copyright (c) BlueStone Technological Enterprises Inc., 2016-2017
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

var sconError = {};

sconError.errorCodes = {};
sconError.errorMesages = {};

sconError.defineError = function ( errorName, errorCode, errorMessage ){
	
	sconError.errorCodes[ errorName ] = errorCode;
	sconError.errorMesages[ errorCode ] = errorMessage;
	
};

sconError.Exception = function( errorCode , details){
	
	this.message = sconError.errorMesages[ errorCode ];
	if(details){
		this.message += " ("+details+")";
	}
	this.name = "sconException";
	this.code = errorCode;
   
};

/********************************************

			Error definitions

********************************************/


sconError.defineError( "noMagicNumber", 0, "The string provided did not have a matching magic number!" );
sconError.defineError( "unknownObjectType", 1, "The string contains an unknown object type!" );

module.exports = sconError;
