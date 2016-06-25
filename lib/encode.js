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

sbtag.encode = function ( object, buf, offset, bsize ){
	
	buf = buf || Buffer(bsize || sbtag.bufferSize);
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
	
	return { result: buf.toString( null, 0, offset ), offset: offset };
}

module.exports = sbtag;