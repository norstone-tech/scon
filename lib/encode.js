/**
 * Swift Binary Tag
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

scon.writeKey = function(buf,key,offset){
	
	if (key!=null){
		
		key+=""; //Cast to string. TODO: Support number key types.
		buf.writeUInt16BE( key.length, offset ); offset += 2;
		buf.write( key, offset ); offset += key.length;
		
	}

	return offset;
}

scon.writeValue = function(buf,key,value,offset){
	
	switch( typeof value ){
		
		case "number":
		
			// Integer
			if ( value % 1 === 0 ){
				
				buf.writeUInt8( scon.int32, offset ); offset += 1;
				offset = scon.writeKey(buf,key,offset);
				buf.writeInt32BE( value, offset ); offset += 4;
				
			// Float
			} else {
				
				buf.writeUInt8( scon.float32, offset ); offset += 1;
				offset = scon.writeKey(buf,key,offset);
				buf.writeFloatBE( value, offset ); offset += 4;
				
			}
			
			break;
			
		case "string":
			buf.writeUInt8( scon.string, offset ); offset += 1;
			offset = scon.writeKey(buf,key,offset);
			buf.writeUInt32BE( value.length, offset ); offset += 4;
			buf.write( value, offset ); offset += value.length;
			break;
			
		case "object":
		
			if (Array.isArray(value)){
				
				buf.writeUInt8( scon.array, offset ); offset += 1;
				offset = scon.writeKey(buf,key,offset);
				buf.writeUInt32BE( value.length, offset ); offset += 4;
				for (var i=0;i<value.length;i+=1){
					offset = scon.writeValue(buf,null,value[i],offset)
				}
				//null is a type of object!
				
			}else if (value == null){
				
				buf.writeUInt8( scon.null, offset ); offset += 1; 
				
			}else{
				
				buf.writeUInt8( scon.compound, offset ); offset += 1;
				offset = scon.writeKey(buf,key,offset);
				offset = scon.encode( value, buf, offset ).offset;
				
			}
			break;
			
		case "boolean":
			buf.writeUInt8( scon.boolean, offset ); offset += 1;
			offset = scon.writeKey(buf,key,offset);
			buf.writeUInt8( value | 0, offset ); offset += 1;//A boolean is 87.5% wasted space :^)
			break;
			
		case "undefined":
			buf.writeUInt8( scon.undefined, offset ); offset += 1;
			break;
			
	}
	
	return offset;
	
}

scon.encode = function ( object, buf, offset, bsize ){
	
	if (buf==null){
		buf = new Buffer(bsize || scon.bufferSize);
		buf.fill(255);
	}
	
	offset = offset | 0;
	
	// write magic number
	if ( offset == 0 ){
		buf.write( scon.magicNumber, offset ); offset += scon.magicNumber.length;
	}
	
	Object.keys(object).forEach(function(key) {
		
		var value = object[ key ];
		offset=scon.writeValue(buf,key,value,offset);
	});
	
	buf.writeUInt8( scon.endBlock, offset ); offset += 1;
	return { result: buf.toString( 'binary', 0, offset ), offset: offset };
	
}

module.exports = scon;
