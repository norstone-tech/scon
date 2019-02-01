/**
 * Swift-Cardinal Object Notation
 * https://github.com/BlueStone-Tech-Enterprises/scon/
 *
 * Copyright (c) BlueStone Technological Enterprises Inc., 2016-2017
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

const scon = {};
const sconUtil = require( "./util.js" );

sconUtil.loadSubmodule( scon, "lib/conf.js" );
sconUtil.loadSubmodule( scon, "lib/error.js" );
sconUtil.loadSubmodule( scon, "lib/bufferWrapper.js" );

scon.writeDouble = function(key,value){
	const keybuff = scon.writeKey(scon.float64,key)
	const result = scon.bufferAlloc(keybuff.length+8);
	result.set(keybuff);
	const offset = keybuff.length + 8;
	
	//Lazy way to convert a double to a byte array.
	const arrbuff = new ArrayBuffer(8);
	const fArrRaw = scon.bufferFrom(arrbuff);
	const fArr = new Float64Array(arrbuff);
	fArr[0] = value;
	
	//JS Stores doubles in LE, so we gotta convert to BE.
	for (let i=0;i<8;i+=1){
		result[offset - i - 1] = fArrRaw[i];
	}
	return result;
}
const zeroLengthTypes = {}
zeroLengthTypes[scon.uint8] = scon.uint0;
zeroLengthTypes[scon.int8] = scon.int0;
zeroLengthTypes[scon.string8] = scon.string0;
zeroLengthTypes[scon.array8] = scon.array0;
zeroLengthTypes[scon.uint8] = scon.uint0;
zeroLengthTypes[scon.utf8string8] = scon.utf8string0;

// Based on NodeJS's buffer object
scon.writeInt = function(key,value,datatype){
	let byteLength = 0;
	let offset = 0;
	let buff;
	if (value === 0){
		buff = scon.writeKey(zeroLengthTypes[datatype] || scon.uint0,key)
	}else if (datatype === scon.int8) {
		const abs = Math.abs(value);
		if (abs >= Math.pow(2,47)){
			byteLength = -1;
		}else if (abs >= Math.pow(2,39)){
			byteLength = 6;
		}else if (abs >= Math.pow(2,31)){
			byteLength = 5;
		}else if (abs >= Math.pow(2,23)){
			byteLength = 4;
		}else if (abs >= Math.pow(2,15)){
			byteLength = 3;
		}else if (abs >= Math.pow(2,7)){
			byteLength = 2;
		}else{
			byteLength = 1;
		}
		if (byteLength != -1){
			const keybuff = scon.writeKey(datatype + byteLength - 1,key)
			buff = scon.bufferAlloc(keybuff.length+byteLength);
			buff.set(keybuff);
			offset = keybuff.length;

			let i = byteLength - 1;
			let mul = 1;
			let sub = 0;
			buff[offset + i] = value;
			while (--i >= 0 && (mul *= 0x100)) {
				if (value < 0 && sub === 0 && buff[offset + i + 1] !== 0)
				sub = 1;
				buff[offset + i] = ((value / mul) >> 0) - sub;
			}
		}
	}else{
		if (value >= Math.pow(2,48)){
			byteLength = -1;
		}else if (value >= Math.pow(2,40)){
			byteLength = 6;
		}else if (value >= Math.pow(2,32)){
			byteLength = 5;
		}else if (value >= Math.pow(2,24)){
			byteLength = 4;
		}else if (value >= Math.pow(2,16)){
			byteLength = 3;
		}else if (value >= Math.pow(2,8)){
			byteLength = 2;
		}else{
			byteLength = 1;
		}
		if (byteLength != -1){
			const keybuff = scon.writeKey(datatype + byteLength - 1,key)
			buff = scon.bufferAlloc(keybuff.length+byteLength);
			buff.set(keybuff);
			offset = keybuff.length;

			let i = byteLength - 1;
			let mul = 1;
			buff[offset + i] = value;
			while (--i >= 0 && (mul *= 0x100)){
				buff[offset + i] = (value / mul) >>> 0;
			}
		}
	}
	if (buff){
		return buff;
	}else{
		return scon.writeDouble(key,value);
	}
}

scon.writeKey = function(type,key){
	
	if (key==null){
		return scon.bufferFrom([type]);
	}else{
		key+=""; //Cast to string. TODO: Support number key types.
		const keyArr = scon.stringToBuffer(key);
		if (keyArr.length > 255){
			var fullArr = scon.bufferAlloc(keyArr.length + 3);
			fullArr[0] = type;
			fullArr[1] = keyArr.length >>> 8;
			fullArr[2] = keyArr.length; //Store 16 bit int BE
			fullArr.set(keyArr, 3);
		}else{
			var fullArr = scon.bufferAlloc(keyArr.length + 2);
			fullArr[0] = type | 128;
			fullArr[1] = keyArr.length;
			fullArr.set(keyArr, 2);
		}

	}
	return fullArr;
};

scon.writeValue = function(key,value){
	let valbuff;
	let type;
	switch( typeof value ){
		
		case "number":
		
			//NaN
			if (isNaN(value)){
				type = scon.nan;
			}else if ( value === Number.POSITIVE_INFINITY ){
				type = scon.floatInf;
			}else if ( value === Number.NEGATIVE_INFINITY ){
				type = scon.floatNegInf;
			}else if ( value % 1 === 0 ){
				if (value >= 0){
					valbuff = scon.writeInt(key,value,scon.uint8);
				}else{
					valbuff = scon.writeInt(key,value,scon.int8);
				}
				
			// Float
			} else {
				valbuff = scon.writeDouble(key,value);
			}
			
			break;
			
		case "string":
			const byteStr = scon.stringToBuffer(value);
			const keybuff = scon.writeInt(key,byteStr.length,scon.utf8string8);
			valbuff = scon.bufferAlloc(keybuff.length + byteStr.length);
			valbuff.set(keybuff);
			valbuff.set(byteStr,keybuff.length);
			break;
			
		case "object":
		
			if (Array.isArray(value)){
				if (value.length > 0){
					let arrayOfArrays = [];// Array of typedArrays :)
					arrayOfArrays[0] = scon.writeInt(key,value.length,scon.array8);
					for (let i=0;i<value.length;i+=1){
						arrayOfArrays[i+1] = scon.writeValue(null,value[i]);
					}
					let valbufflen = 0;
					for (let i=0;i<arrayOfArrays.length;i+=1){
						valbufflen += arrayOfArrays[i].length;
					}
					valbuff = scon.bufferAlloc(valbufflen);
					let offset = 0
					for (let i=0;i<arrayOfArrays.length;i+=1){
						valbuff.set(arrayOfArrays[i],offset);
						offset += arrayOfArrays[i].length;
					}
				}else{
					type = scon.array0;
				}
			}else if (value instanceof Uint8Array){
				//null is a type of object!
				const keybuff = scon.writeInt(key,value.length,scon.string8);
				valbuff = scon.bufferAlloc(keybuff.length + value.length);
				valbuff.set(keybuff);
				valbuff.set(value,keybuff.length);
			}else if (value == null){
				type = scon.null;
			}else{
				const keybuff = scon.writeKey(scon.compound,key);
				const obj = scon.encode(value,false);
				valbuff = scon.bufferAlloc(keybuff.length + obj.length);
				valbuff.set(keybuff);
				valbuff.set(obj,keybuff.length);				
			}
			
			break;
			
		case "boolean":
			type = scon.boolfalse + (value | 0);
			break;
			
		case "undefined":
			type = scon.undefined;
			break;
		default:
			throw new Error("Unknown typeof: "+(typeof value));
	}
	if (valbuff == null){
		return scon.writeKey(type,key);
	}
	return valbuff;
	
};

scon.encode = function(object,writeMagicNumber){
	let buff;
	if (writeMagicNumber==null || writeMagicNumber){
		buff = scon.bufferFrom(scon.magicNumberArr);
	}else{
		buff = scon.bufferAlloc(0);
	}
	for (let key in object){
		const value = object[ key ];
		const valbuff = scon.writeValue(key,value);
		const c = scon.bufferAlloc(buff.length + valbuff.length);
		c.set(buff);
		c.set(valbuff, buff.length);
		buff = c;
	}
	
	const c = scon.bufferAlloc(buff.length + 1); // Too bad there's no way to append to a type array
	c.set(buff);
	c.set([scon.endBlock], buff.length);
	buff = c;
	return buff;
}
module.exports = scon;
