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

scon.writeKey = function(buf,key,offset){
	
	if (key!=null){
		
		key+=""; //Cast to string. TODO: Support number key types.
		buf.writeUInt16BE( key.length, offset ); offset += 2;
		buf.write( key, offset ); offset += key.length;
		
	}

	return offset;
};

scon.writeInt = function(buf,value,key,typeid,offset){
	var abs = Math.abs(value);
	if (abs >= Math.pow(2,47)){
		
		buf.writeUInt8( scon.float64, offset ); offset += 1;
		offset = scon.writeKey(buf,key,offset);
		buf.writeDoubleBE( value, offset ); offset += 8;
		
	}else if (abs >= Math.pow(2,39)){
		
		buf.writeUInt8( typeid+5, offset ); offset += 1;
		offset = scon.writeKey(buf,key,offset);
		buf.writeUIntBE(value, offset, 6); offset += 6;
		
	}else if (abs >= Math.pow(2,31)){
		
		buf.writeUInt8( typeid+4, offset ); offset += 1;
		offset = scon.writeKey(buf,key,offset);
		buf.writeUIntBE(value, offset, 5); offset += 5;
		
	}else if (abs >= Math.pow(2,23)){
		
		buf.writeUInt8( typeid+3, offset ); offset += 1;
		offset = scon.writeKey(buf,key,offset);
		buf.writeUIntBE(value, offset, 4); offset += 4;
		
	}else if (abs >= Math.pow(2,15)){
		
		buf.writeUInt8( typeid+2, offset ); offset += 1;
		offset = scon.writeKey(buf,key,offset);
		buf.writeUIntBE(value, offset, 3); offset += 3;
		
	}else if (abs >= Math.pow(2,7)){
			
		buf.writeUInt8( typeid+1, offset ); offset += 1;
		offset = scon.writeKey(buf,key,offset);
		buf.writeUIntBE(value, offset, 2); offset += 2;
		
	}else{
		
		buf.writeUInt8( typeid, offset ); offset += 1;
		offset = scon.writeKey(buf,key,offset);
		buf.writeUIntBE(value, offset, 1); offset += 1;
		
	}
	return offset;
}

//BUG? Arrays and strings with length >= 2^48 may yield unexpected results.
scon.writeUInt = function(buf,value,key,typeid,offset){
	if (value >= Math.pow(2,48)){
		
		buf.writeUInt8( scon.float64, offset ); offset += 1;
		offset = scon.writeKey(buf,key,offset);
		buf.writeDoubleBE( value, offset ); offset += 8;
		
	}else if (value >= Math.pow(2,40)){
		
		buf.writeUInt8( typeid+5, offset ); offset += 1;
		offset = scon.writeKey(buf,key,offset);
		buf.writeUIntBE(value, offset, 6); offset += 6;
		
	}else if (value >= Math.pow(2,32)){
		
		buf.writeUInt8( typeid+4, offset ); offset += 1;
		offset = scon.writeKey(buf,key,offset);
		buf.writeUIntBE(value, offset, 5); offset += 5;
		
	}else if (value >= Math.pow(2,24)){
		
		buf.writeUInt8( typeid+3, offset ); offset += 1;
		offset = scon.writeKey(buf,key,offset);
		buf.writeUIntBE(value, offset, 4); offset += 4;
		
	}else if (value >= Math.pow(2,16)){
		
		buf.writeUInt8( typeid+2, offset ); offset += 1;
		offset = scon.writeKey(buf,key,offset);
		buf.writeUIntBE(value, offset, 3); offset += 3;
		
	}else if (value >= Math.pow(2,8)){
		
		buf.writeUInt8( typeid+1, offset ); offset += 1;
		offset = scon.writeKey(buf,key,offset);
		buf.writeUIntBE(value, offset, 2); offset += 2;
		
	}else{
		
		buf.writeUInt8( typeid, offset ); offset += 1;
		offset = scon.writeKey(buf,key,offset);
		buf.writeUIntBE(value, offset, 1); offset += 1;
		
	}
	return offset;
}

scon.writeValue = function(buf,key,value,offset){
	
	switch( typeof value ){
		
		case "number":
		
			//NaN
			if (isNaN(value)){
				
				buf.writeUInt8( scon.nan, offset ); offset += 1;
				offset = scon.writeKey(buf,key,offset);
				
			// Integer
			}else if ( value % 1 === 0 ){
				if (value>=0){
					
					offset = scon.writeUInt(buf,value,key,scon.uint8,offset);
					
				}else{
					
					offset = scon.writeInt(buf,value,key,scon.int8,offset);
				
				}
				
			// Float
			} else {
				
				buf.writeUInt8( scon.float64, offset ); offset += 1;
				offset = scon.writeKey(buf,key,offset);
				buf.writeDoubleBE( value, offset ); offset += 8;
				
			}
			
			break;
			
		case "string":
			offset = scon.writeUInt(buf,value.length,key,scon.string8,offset);
			buf.write( value, offset, value.length, "binary" ); offset += value.length;
			break;
			
		case "object":
		
			if (Array.isArray(value)){
				
				offset = scon.writeUInt(buf,value.length,key,scon.array8,offset);
				for (var i=0;i<value.length;i+=1){
					offset = scon.writeValue(buf,null,value[i],offset)
				}
				//null is a type of object!
				
			}else if (value == null){
				
				buf.writeUInt8( scon.null, offset ); offset += 1; 
				offset = scon.writeKey(buf,key,offset);
				
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
	
};

scon.encode = function ( object, buf, offset, bsize ){
	
	if ( buf == null ){
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
	
};

module.exports = scon;
