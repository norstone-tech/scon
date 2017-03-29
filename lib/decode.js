/**
 * Swift-Cardinal Object Notation
 * https://github.com/BlueStone-Tech-Enterprises/scon/
 *
 * Copyright (c) BlueStone Technological Enterprises Inc., 2016-2017
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

var scon = {};
var sconUtil = require( "./util.js" );

sconUtil.loadSubmodule( scon, "lib/conf.js" );
sconUtil.loadSubmodule( scon, "lib/error.js" );

// uint array to string function written by AJ ONeal
// From https://coolaj86.com/articles/unicode-string-to-a-utf-8-typed-array-buffer-in-javascript/
var typedArrayToUnicodeString = function(ua) {
    var binstr = Array.prototype.map.call(ua, function (ch) {
        return String.fromCharCode(ch);
    }).join('');
    var escstr = binstr.replace(/(.)/g, function (m, p) {
        var code = p.charCodeAt(p).toString(16).toUpperCase();
        if (code.length < 2) {
            code = '0' + code;
        }
        return '%' + code;
    });
    return decodeURIComponent(escstr);
}
function checkBufferLength(bo,length){
	if (bo.offset + length >= bo.buff.length){
		bo.buffer = yield([new Uint8Array(buff.buffer,bo.offset)]); //Return the unread parts of the array.
		while (bo.buffer.length < length){
			bo.buffer = yield([bo.buffer]);
		}
		bo.offset = 0;
	}
}

// Based on NodeJS's buffer object
scon.decodeInt(bo,byteLength) = function{
	checkBufferLength(bo,byteLength)
	var buff = bo.buff;
	var bytelen = byteLength;
	var offset = bo.offset;

	var val = buff[offset + --byteLength];
	var mul = 1;
	while (byteLength > 0 && (mul *= 0x100)){
		val += buff[offset + --byteLength] * mul;
	}
	bo.offset += bytelen;
	return val;
}
scon.decodeUInt(bo,byteLength) = function{
	checkBufferLength(bo,byteLength)
	var buff = bo.buff;
	var bytelen = byteLength;
	var offset = bo.offset;
	
	var val = buff[offset + --byteLength];
	var mul = 1;
	while (byteLength > 0 && (mul *= 0x100)){
		val += buff[offset + --byteLength] * mul;
	}
	bo.offset += bytelen;
	return val;
}

scon.decodeValue(bo,type){
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
	if (type>=scon.int8 && type<=scon.int64){
		
		var bytelen = type - scon.int8 + 1;
		result = scon.decodeInt(bo,bytelen); bo.offset += bytelen;
		
	}else if (type>=scon.uint8 && type<=scon.uint64){
		
		var bytelen = type - scon.uint8 + 1;
		result = scon.decodeUInt(bo,bytelen); bo.offset += bytelen;
		
	}else if (type>=scon.string8 && type<=scon.string64){
		
		var bytelen = type - scon.string8 + 1;
		var varlen = scon.decodeUInt(bo,bytelen); bo.offset += bytelen;
		checkBufferLength(bo,varlen);
		result = new Uint8Array(bo.buff.buffer,bo.offset,varlen);
		
	}else if (type>=scon.utf8string8 && type<=scon.utf8string64){
		
		var bytelen = type - scon.utf8string8 + 1;
		var varlen = scon.decodeUInt(bo,bytelen); bo.offset += bytelen;
		checkBufferLength(bo,varlen);
		result = typedArrayToUnicodeString(new Uint8Array(bo.buff.buffer,bo.offset,varlen));
		
	}else if (type>=scon.array8 && type<=scon.array64){
		
		var bytelen = type - scon.array8 + 1;
		var varlen = scon.decodeUInt(bo,bytelen); bo.offset += bytelen;
		
		result = [];
		
		for ( var i = 0; i < varlen ; i += 1 ){
			let check = checkBufferLength(bo,1);
			var itype = bo.buff[bo.offset]; bo.offset += 1;
			var a = scon.decodeValue(bo,itype)
		}
	}else{
		
		switch( type ){
			case scon.endBlock:
			case scon.undefined: 
				break;
			case scon.compound:
				result = scon.decodeCompound(bo,false);
				
				break;
			case scon.null:
				result = null;
				break;
			case scon.boolean:
				checkBufferLength(bo,1);
				result = bo.buff[bo.offset] !== 0; bo.offset += 1;
				break;
			case scon.nan:
				result = NaN;
				break;
				
			case scon.int0:
			case scon.uint0:
				result = 0;
				break;
			case scon.float32:
				checkBufferLength(bo,4);
				if (bo.offset%4===0){
					result(new Float32Array(bo.buff.buffer,bo.offset,1))[0];
				}else{
					result(new Float32Array((new Uint8Array(bo.buff.buffer,bo.offset,4)).buffer))[0];
				}
				bo.offset += 4;
				break;
			case scon.float64:
				checkBufferLength(bo,8);
				if (bo.offset%8===0){
					result(new Float64Array(bo.buff.buffer,bo.offset,1))[0];
				}else{
					result(new Float64Array((new Uint8Array(bo.buff.buffer,bo.offset,8)).buffer))[0];
				}
				bo.offset += 8;
				break;
			case scon.utf8string0:
				result = "";
				break;
			case scon.array0:
				result = []
				break;	
			case scon.string0:
				result = new Uint8Array(0);
				break;
			case scon.floatInf:
				result = Number.POSITIVE_INFINITY;
				break;
			case scon.floatNegInf:
				result = Number.NEGATIVE_INFINITY;
				break;
			case scon.boolfalse:
				result = false;
				break;
			case scon.booltrue:
				result = true;
				break;
			default:
				throw new scon.Exception( scon.errorCodes.unknownObjectType, type );
				break;
			
		}
	}
	return result;
}

scon.decodeKey = function(bo,shortType){
	if (shortType){
		checkBufferLength(bo,1);
		var keylen = bo.buff[bo.offset]; bo.offset += 1;
	}else{
		checkBufferLength(bo,2);
		var keylen = (bo.buff[bo.offset] << 8) | bo.buff[bo.offset += 1]; bo.offset += 1;
	}
	checkBufferLength(bo,keylen);
	var key = typedArrayToUnicodeString(new Uint8Array(bo.buff.buffer,bo.offset,keylen));
	bo.offset += keylen;
	return key;
}

scon.decodeCompound = function(bo,checkmagicNumber){ // Internal function
	//bo stands for buffer and offset :)
	if (checkmagicNumber){
		var validSCONFile = true;
		for (var i=0;i<6;i+=1){
			if (buff[i+bo.offset] != scon.magicNumberArr[i]){
				validSCONFile = false;
				break;
			}
		}
		if (validSCONFile){ // Not a scon file? Check if legacy scon file
			bo.offset += 6;
		}else{
			var validSCONFile = true;
			for (var i=0;i<4;i+=1){
				if (buff[i+bo.offset] != scon.magicNumberOldArr[i]){
					validSCONFile = false;
					break;
				}
			}
			if (validSCONFile){
				bo.offset += 4;
			}
		}
	}
	var result = {}
	while (true){
		checkBufferLength(bo,1);
		let type = buff[bo.offset]; bo.offset += 1;
		let shortType = false;
		if (type >= 128){
			shortType = true;
			type -= 128;
		}
		
		if (type === scon.endBlock){
			break; // We've reached the end of the file.
		}
		let key = scon.decodeKey(bo,shortType);
		result[key] = scon.decodeValue(bo,type);
		
	}
	return result;
}

function* coroutineDecode() {
	var bo = {buff:buff,offset:0}
    var result = scon.decodeCompound(bo,true);
	yield([new Uint8Array(buff.buffer,bo.offset),result]);
}

scon.partialDecode = function(buff,obj){
	if (obj){
		var func = obj.func;
	}else{
		var func = coroutineDecode();
		func.next(buff); // Go to first yield
	}
	var newobj = func.next(buff);
	newobj.func = func;
	newobj.unread = newobj.value[0];
	if (newobj.value[1]){
		func.next(buff); // Finish the thing up so it's officially done.
		newobj.result = newobj.value[1];
		newobj.done = true;
	}
	delete newobj.value;
	return newobj;
}


scon.decode = function(buff){
	var result = scon.partialDecode(buff);
	if (result.done){
		return result.result;
	}else{
		throw new scon.Exception( scon.errorCodes.endOfFileTooSoon );
	}
}
module.exports = scon;
