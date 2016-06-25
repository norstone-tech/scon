/**
 * Swift Binary Tag
 * https://github.com/JamesxX/sbtag
 *
 * Copyright (c) 2016 James R Swift
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

var sbtag = {};
var sbtagUtil = require( "./util.js" );

sbtagUtil.loadSubmodule( sbtag, "lib/conf.js" );
sbtagUtil.loadSubmodule( sbtag, "lib/error.js" );

sbtag.decode = function ( string, verify, offset ){
	var result = {};
	var buf = new Buffer( string );
	
	// confirm we are dealing with an sbtag file
	if ( verify && buf.toString( null, 0,sbtag.magicNumber.length ) != sbtag.magicNumber ){
		
		throw new sbtagError.Exception( sbtag.errorCodes.noMagicNumber );
		return false;
		
	}
	
	var _offset = offset || sbtag.magicNumber.length;
	
	while ( _offset < buf.length && _offset >= 0){
		
		var exitLoop = false;
		
		var type = buf.readInt8(_offset); _offset += 1;
		var nameLength = buf.readInt16BE(_offset); _offset += 2;
		var name = buf.toString(null, _offset, _offset + nameLength); _offset += nameLength;
		
		switch( type ){
				
			// int32
			case sbtag.int32:
				result[ name ] = buf.readInt32BE(_offset); _offset += 4;
				break;
				
			// float32
			case sbtag.float32:
				result[ name ] = buf.readFloatBE(_offset); _offset += 4;
				break;
				
			// string <n>
			case sbtag.string:
				var varLength = buf.readInt16BE(_offset); _offset += 2;
				result[ name ] = buf.toString(null, _offset, _offset + varLength); _offset += varLength;
				break;
				
			// compound
			case sbtag.compound:
				var compound = sbtag.decode( buf, false, _offset );
				result[ name ] = compound.result; _offset = compound.offset;
				break;
				
			// end block
			case sbtag.endBlock:
			default:
				_offset += 1;
				exitLoop = true;
				break;
			
		}
		
		if ( exitLoop ){
			return { result: result, offset: _offset };
		}
	
	}
	
	return { result: result, offset: _offset };
}

module.exports = sbtag;