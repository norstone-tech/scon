/**
 * Swift-Cardinal Object Notation
 * https://github.com/JamesxX/scon
 *
 * Copyright (c) Aritz Beobide-Cardinal, 2016 James R Swift
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

var scon = {};
var sconUtil = require( "./util.js" );

sconUtil.loadSubmodule( scon, "lib/conf.js" );
sconUtil.loadSubmodule( scon, "lib/error.js" );

scon.decodeValue = function(buf,type,_offset){
	
	var result;
	switch( type ){ //Backwards compatibility.
		case scon.int32old:
			type = scon.int32;
			break;
			
		case scon.float64old:
			type = scon.float64;
			break;
			
		case scon.stringold:
			type = scon.string32;
			break;
		case scon.arrayold:
			type = scon.array32;
			break;
	}
	if (type>=scon.int8 && type<=scon.int48){
		
		var bytelen = type - scon.int8 + 1;
		result = buf.readIntBE(_offset,bytelen); _offset += bytelen;
		
	}else if (type>=scon.uint8 && type<=scon.uint48){
		
		var bytelen = type - scon.uint8 + 1;
		result = buf.readUIntBE(_offset,bytelen); _offset += bytelen;
		
	}else if (type>=scon.string8 && type<=scon.string48){
		
		var bytelen = type - scon.string8 + 1;
		var varlen = buf.readUIntBE(_offset,bytelen); _offset += bytelen;
		result = buf.toString("binary", _offset, _offset + varlen); _offset += varlen;
		
	}else if (type>=scon.array8 && type<=scon.array48){
		
		var bytelen = type - scon.array8 + 1;
		var varlen = buf.readUIntBE(_offset,bytelen); _offset += bytelen;
		result = [];
		
		for ( var i = 0; i < varlen ; i += 1 ){
			
			var itype = buf.readUInt8(_offset); _offset += 1;
			var a = scon.decodeValue(buf,itype,_offset)
			result[ i ] = a[0];
			_offset = a[1];
			
		}
	}else{
		
		switch( type ){
				
			// compound
			case scon.compound:
				var compound = scon.decode( buf, false, _offset );
				result = compound.result; _offset = compound.offset;
				break;
			
			case scon.null:
				result = null;
				break;
				
			case scon.endBlock:
			case scon.undefined: 
				break;
			
			case scon.boolean:
				result = buf.readUInt8(_offset) !== 0; _offset += 1;
				break;
			case scon.nan:
				result = NaN;
				break;
					
			default:
				throw new scon.Exception( scon.errorCodes.unknownObjectType, type );
				break;
			
		}
	}
	return [result,_offset];
	
};

scon.decode = function ( string, verify, offset ){
	
	var result = {};
	var buf = new Buffer( string ,'binary');
	
	// confirm we are dealing with an scon file
	if ( verify && buf.toString( null, 0,scon.magicNumber.length ) != scon.magicNumber ){
		
		throw new scon.Exception( scon.errorCodes.noMagicNumber );
		return false;
		
	}
	
	var _offset = offset || scon.magicNumber.length;

	while ( _offset < buf.length && _offset >= 0){
		
		var type = buf.readUInt8(_offset); _offset += 1;
		if (type==scon.endBlock){
			
			//_offset += 1;
			return { result: result, offset: _offset };
			
		}else{
			
			var nameLength = buf.readUInt16BE(_offset); _offset += 2;
			
			var name = buf.toString(null, _offset, _offset + nameLength); _offset += nameLength;
			var a = scon.decodeValue(buf,type,_offset)
			
			result[ name ] = a[0];
			_offset = a[1];
			
		}
	}
	
	return { result: result, offset: _offset };
	
};

module.exports = scon;
