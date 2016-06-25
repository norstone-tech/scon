/**
 * Swift Binary Tag
 * https://github.com/JamesxX/sbtag
 *
 * Copyright (c) Aritz Beobide-Cardinal, 2016 James R Swift
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

var sbtag = {};
var sbtagUtil = require( "./util.js" );

sbtagUtil.loadSubmodule( sbtag, "lib/conf.js" );
sbtagUtil.loadSubmodule( sbtag, "lib/error.js" );

sbtag.decodeValue = function(buf,type,_offset){
	
	var result;
	
	switch( type ){
		
		// int32
		case sbtag.int32:
			result = buf.readInt32BE(_offset); _offset += 4;
			break;
			
		// float32
		case sbtag.float32:
			result = buf.readFloatBE(_offset); _offset += 4;
			break;
			
		// string <n>
		case sbtag.string:
			var varLength = buf.readUInt32BE(_offset); _offset += 4;
			result = buf.toString(null, _offset, _offset + varLength); _offset += varLength;
			break;
			
		// compound
		case sbtag.compound:
			var compound = sbtag.decode( buf, false, _offset );
			result = compound.result; _offset = compound.offset;
			break;
			
		case sbtag.array:
			result = [];
			var len = buf.readUInt32BE(_offset); _offset += 4;
			for (var i=0;i<len;i+=1){
				var itype = buf.readUInt8(_offset); _offset += 1;
				var a = sbtag.decodeValue(buf,itype,_offset)
				result[ i ] = a[0];
				_offset = a[1];
			}
			break;
			
		case sbtag.null:
			result = null;
			break;
			
		case sbtag.endBlock:
		case sbtag.undefined: 
			break;
		
		case sbtag.boolean:
			result = buf.readUInt8(_offset) !== 0; _offset += 1;
			break;
			
		// end block
		case sbtag.endBlock:
			break;
			
		default:
			throw new sbtag.Exception( sbtag.errorCodes.unknownObjectType, type );
			break;
		
	}
	
	return [result,_offset];
	
}

sbtag.decode = function ( string, verify, offset ){
	
	var result = {};
	var buf = new Buffer( string ,'binary');
	
	// confirm we are dealing with an sbtag file
	if ( verify && buf.toString( null, 0,sbtag.magicNumber.length ) != sbtag.magicNumber ){
		
		throw new sbtag.Exception( sbtag.errorCodes.noMagicNumber );
		return false;
		
	}
	
	var _offset = offset || sbtag.magicNumber.length;

	while ( _offset < buf.length && _offset >= 0){
		
		var type = buf.readUInt8(_offset); _offset += 1;
		if (type==sbtag.endBlock){
			
			//_offset += 1;
			return { result: result, offset: _offset };
			
		}else{
			
			var nameLength = buf.readUInt16BE(_offset); _offset += 2;
			
			var name = buf.toString(null, _offset, _offset + nameLength); _offset += nameLength;
			var a = sbtag.decodeValue(buf,type,_offset)
			
			result[ name ] = a[0];
			_offset = a[1];
			
		}
	}
	
	return { result: result, offset: _offset };
	
}

module.exports = sbtag;
