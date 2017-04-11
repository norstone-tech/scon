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

sconError.Exception = function( errorCode , details) {
	this.name = 'sconException';
	this.message = sconError.errorMesages[ errorCode ];
	if(details){
		this.message += " ("+details+")";
	}
	this.name = "sconException";
	this.code = errorCode;
	
	// --WORKAROUND BECAUSE I HAVE NO IDEA HOW TO INHERENT FORM ERROR PROPERLY-- //
    var err = new Error();
	var stackpos = err.stack.indexOf("\n",6) //Error is usually 5 chars long
	this.stack = this.name+": "+this.message+"\n"+err.stack.substr(stackpos+1);
}
sconError.Exception.prototype = Error.prototype;

/********************************************

			Error definitions

********************************************/


sconError.defineError( "noMagicNumber", 0, "Not SCON data (invalid magic number)" );
sconError.defineError( "unknownObjectType", 1, "The string contains an unknown object type!" );
sconError.defineError( "endOfFileTooSoon", 2, "The scon data ends unexpectedly" );

module.exports = sconError;
