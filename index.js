/**
 * Swift Binary Tag
 * https://github.com/JamesxX/sbtag
 *
 * Copyright (c) 2016 James R Swift
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

var Buffer = require('buffer').Buffer;

var sbtag = {}

sbtag.magicNumber = "sbtag"
sbtag.bufferSize = 50 * 1024 // 50kb

sbtag.endBlock = 0;
sbtag.int32 = 1;
sbtag.float32 = 2;
sbtag.string = 3;
sbtag.compount = 4;
sbtag.reserved = 255;

sbtag.encode = function ( object, buf, offset ){
	
	buf = buf || Buffer(50);
	offset = offset || 0;
	
	// write magic number
	if ( offset == 0 ){
		buf.write( sbtag.magicNumber, offset ); offset += sbtag.magicNumber.length;
	}
	
	Object.keys(object).forEach(function(key) {
		
		var value = object[ key ];
		
		switch( typeof value ){
			
			case "number":
				
				// Integer
				if ( value % 1 === 0 ){
					
					buf.writeInt8( sbtag.int32, offset ); offset += 1;
					buf.writeInt16BE( key.length, offset ); offset += 2;
					buf.write( key, offset ); offset += key.length;
					buf.writeInt32BE( value, offset ); offset += 4;
					
				// Float
				} else {
					
					buf.writeInt8( sbtag.float32, offset ); offset += 1;
					buf.writeInt16BE( key.length, offset ); offset += 2;
					buf.write( key, offset ); offset += key.length;
					buf.writeFloatBE( value, offset ); offset += 4;
					
				}
				
				break;
				
			case "string":
			
				buf.writeInt8( sbtag.string, offset ); offset += 1;
				buf.writeInt16BE( key.length, offset ); offset += 2;
				buf.write( key, offset ); offset += key.length;
				buf.writeInt16BE( value.length, offset ); offset += 2;
				buf.write( value, offset ); offset += value.length;
				
				break;
				
			case "object":
			
				buf.writeInt8( sbtag.compound, offset ); offset += 1;
				buf.writeInt16BE( key.length, offset ); offset += 2;
				buf.write( key, offset ); offset += key.length;
				
				offset = sbtag.encode( value, buf, offset ).offset;
				
				break;
		}
		
	});
	
	buf.writeInt8( sbtag.endBlock, offset ); offset += 1;
	
	return { result: buf.toString(), offset: offset };
}

sbtag.decode = function ( string, verify, offset ){
	var result = {};
	var buf = new Buffer( string );
	
	// confirm we are dealing with an sbtag file
	if ( verify && buf.splice( 0, sbtag.magicNumber.length ).toString( ) != sbtag.magicNumber ){
		return false;
	}
	
	var _offset = offset || sbtag.magicNumber.length;
	
	while ( buf.readInt8(_offset) != 0 ){
		
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

// test
console.log( sbtag.encode( { hello: "world!", five: 5 } ) );
console.log( sbtag.decode( sbtag.encode( { hello: "world!", five: 5 } ).result ) );


module.exports = sbtag;