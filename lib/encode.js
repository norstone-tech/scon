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
//http://stackoverflow.com/questions/14071463/how-can-i-merge-typedarrays-in-javascript#14071518
sconUtil.loadSubmodule( scon, "lib/conf.js" );
sconUtil.loadSubmodule( scon, "lib/error.js" );

// string to uint array function written by AJ ONeal
// From https://coolaj86.com/articles/unicode-string-to-a-utf-8-typed-array-buffer-in-javascript/
var unicodeStringToTypedArray = function(s) {
    var escstr = encodeURIComponent(s);
    var binstr = escstr.replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
    });
    var ua = new Uint8Array(binstr.length);
    Array.prototype.forEach.call(binstr, function (ch, i) {
        ua[i] = ch.charCodeAt(0);
    });
    return ua;
}


scon.writeValue = function(buf,key,value,offset){
	/*
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
	*/
};

scon.encode = function(object,buff){
	if (buff == null){
		buff = new Uint8Array(scon.magicNumberArr);
	}
	Object.keys(object).forEach(function(key) {
		var value = object[ key ];
		var valbuff = scon.writeValue(key,value);
	});
}
module.exports = scon;
