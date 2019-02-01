/**
 * Swift-Cardinal Object Notation
 * https://github.com/BlueStone-Tech-Enterprises/scon/
 *
 * Copyright (c) BlueStone Technological Enterprises Inc., 2018
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

const BufferLib = require("arc-bufferlib");
const scon = {};
const sconUtil = require( "./util.js" );

sconUtil.loadSubmodule( scon, "lib/conf.js" );
sconUtil.loadSubmodule( scon, "lib/error.js" );

const zeroLengthTypes = {}
zeroLengthTypes[scon.uint8] = scon.uint0;
zeroLengthTypes[scon.int8] = scon.int0;
zeroLengthTypes[scon.string8] = scon.string0;
zeroLengthTypes[scon.array8] = scon.array0;
zeroLengthTypes[scon.valuePointer8] = scon.valuePointer0;
zeroLengthTypes[scon.utf8string8] = scon.utf8string0;

class InternalSconEncodeData{
	constructor(options){
		this.noDupeStrings = options.noDupeStrings || false; // Boolean
		this.circularObjects = options.circularObjects || false; // Boolean

		this.keyPtrs = {
			//[string]:[number]
		};
		this.stringPtrs = {
			//[string]:[number]
		};
		this.keyArray = [];
		this.dataArrays = [[]]; 
		this.keyArrayRefCount = [0];
		this.dataArrayRefCount = [0];


		this.scopeArray = [0];
		this.resultLen = 0;

		this.objects = [];
	}
	dataArrayPush(data){
		let dataArray = this.dataArrays[this.scopeArray[this.scopeArray.length - 1]];
		if (data instanceof Uint8Array){
			this.resultLen += data.length;
		}else{
			let refCount = data.keyRef ? this.keyArrayRefCount : this.dataArrayRefCount;
			if (refCount[data.ptr] === undefined){
				refCount[data.ptr] = 1;
			}else{
				refCount[data.ptr] += 1;
			}
		}
		dataArray.push(data);
	}
	newScope(){
		let newScope = this.dataArrays.length;
		this.scopeArray.push(newScope);
		this.dataArrays.push([]);
		return newScope;
	}
	popScope(){
		return this.scopeArray.pop();
	}
	newKey(keyBuffer){
		if (keyBuffer.length > 255){
			this.resultLen += keyBuffer.length + 3;
			return this.keyArray.push([
				BufferLib.from([scon.referencedKey, keyBuffer.length >>> 8, keyBuffer.length]),
				keyBuffer
			]);
		}else{
			this.resultLen += keyBuffer.length + 2;
			return this.keyArray.push([
				BufferLib.from([scon.referencedKey | 128, keyBuffer.length]),
				keyBuffer
			]);
		}
	}
}

const encodeDouble = function(encodeObj, key, value){
	if (value == Infinity){
		encodeKey(encodeObj, scon.floatInf, key);
	}else if(value == -Infinity){
		encodeKey(encodeObj, scon.floatNegInf, key);
	}else if(Number.isNaN(value)){
		encodeKey(encodeObj, scon.nan, key);
	}else{
		encodeKey(encodeObj, scon.float64, key);
		let floatInterface = new Float64Array(1);
		floatInterface[0] = value;
		const buff = BufferLib.from(floatInterface.buffer);
		buff.reverse();
		encodeObj.dataArrayPush(buff);
	}

}

function uintByteLength(n){
	if (n === 0){
		return 0;
	}else if (n < 256){ // Math.pow(2,8)
		return 1;
	}else if(n < 65536){ // Math.pow(2,16)
		return 2;
	}else if(n < 16777216){ // Math.pow(2,24)
		return 3;
	}else if(n < 4294967296){ // Math.pow(2,32)
		return 4;
	}else if(n < 1099511627776){ // Math.pow(2,40)
		return 5;
	}else if(n < 281474976710656){ // Math.pow(2,48)
		return 6;
	}else{
		return -1;
	}
}

const encodeInt = function(encodeObj, key, value, datatype){
	let byteLength = 0;
	let offset = 0;
	let buff;
	if (value === 0){
		if (datatype == null){
			/* istanbul ignore next */
			return BufferLib.newBuffer(0); // Nothing ever calls this, so 🤷🏻‍♂️
		}else{
			encodeKey(encodeObj, [zeroLengthTypes[datatype]], key);
			buff = true;
		}
	}else if (datatype === scon.int8) {
		const abs = Math.abs(value);
		if (abs <= 128){ // Math.pow(2,7)
			byteLength = 1;
		}else if (abs <= 32768){ // Math.pow(2,15)
			byteLength = 2;
		}else if (abs <= 8388608){ // Math.pow(2,23)
			byteLength = 3;
		}else if (abs <= 2147483648){ // Math.pow(2,31)
			byteLength = 4;
		}else if (abs <= 549755813888){ // Math.pow(2,39)
			byteLength = 5;
		}else if (abs <= 140737488355328){ // Math.pow(2,47)
			byteLength = 6;
		}else{
			byteLength = -1;
		}

		if (byteLength != -1){
			encodeKey(encodeObj, datatype + byteLength - 1, key);

			buff = BufferLib.newBufferUnsafe(byteLength);
			//offset = 0;

			let i = byteLength - 1;
			let mul = 1;
			let sub = 0;
			buff[offset + i] = value;
			while (--i >= 0 && (mul *= 0x100)) {
				if (value < 0 && sub === 0 && buff[offset + i + 1] !== 0)
				sub = 1;
				buff[offset + i] = ((value / mul) >> 0) - sub;
			}
			encodeObj.dataArrayPush(buff);
		}
	}else{
		byteLength = uintByteLength(value);
		if (byteLength != -1){
			buff = BufferLib.newBufferUnsafe(byteLength);

			let i = byteLength - 1;
			let mul = 1;
			buff[offset + i] = value;
			while (--i >= 0 && (mul *= 0x100)){
				buff[offset + i] = (value / mul) >>> 0;
			}
			if (datatype == null){
				return buff;
			}else{
				encodeKey(encodeObj, datatype + byteLength - 1, key);
				encodeObj.dataArrayPush(buff);
			}
		}
	}
	if (buff == null){
		encodeDouble(encodeObj, key, value);
	}
}

// t kl --------
// t kl 0--
const encodeKey = function(encodeObj, type, key){
	if (key==null){
		encodeObj.dataArrayPush(BufferLib.from([type]));
	}else{
		key+=""; // Cast to string
		const keyBuffer = BufferLib.stringToBuffer(key);
		if (keyBuffer.length > 65535){
			throw new scon.Error(3, "longer than 65535 bytes");
		}
		if (keyBuffer[0] === 0){
			throw new scon.Error(3, "cannot start with \\0");
		}
		if (encodeObj.noDupeStrings && keyBuffer.length > 3){
			let ptr = encodeObj.keyPtrs[key];
			if (ptr == null){
				ptr = encodeObj.newKey(keyBuffer);
				encodeObj.keyPtrs[key] = ptr;
			}
			
			encodeObj.dataArrayPush(
				BufferLib.from([type | 128])
			);
			encodeObj.dataArrayPush({
				keyRef: true,
				ptr
			});
			/*
			let ptrBuffer = encodeInt(encodeObj, null, ptr, null);
			encodeObj.dataArrayPush(
				BufferLib.from([type | 128, ptrBuffer.length + 1, 0])
			);
			encodeObj.dataArrayPush(ptrBuffer);
			*/
		}else{
			if (keyBuffer.length > 255){
				encodeObj.dataArrayPush(
					BufferLib.from([type, keyBuffer.length >>> 8, keyBuffer.length])
				);
			}else{
				encodeObj.dataArrayPush(
					BufferLib.from([type | 128, keyBuffer.length])
				);
			}
			encodeObj.dataArrayPush(keyBuffer);
		}
	}
};

const encodeBuffer = function(encodeObj, key, value){
	encodeInt(encodeObj, key, value.length, scon.string8);
	encodeObj.dataArrayPush(value);
}

const encodeArray = function(encodeObj, key, value){
	encodeInt(encodeObj, key, value.length, scon.array8);
	for (let i = 0; i < value.length; i += 1){
		encodeThing(encodeObj, null, value[i]);
	}
}

const encodeObject = function(encodeObj, key, obj){
	encodeKey(encodeObj, scon.compound, key);
	if (encodeObj.circularObjects){
		for (let k in obj){
			if (k === "___SCON_POINTER"){continue;}
			encodeThing(encodeObj, k, obj[ k ]);
		}
	}else{
		for (let k in obj){
			encodeThing(encodeObj, k, obj[ k ]);
		}
	}

	encodeObj.dataArrayPush(
		BufferLib.from([scon.endBlock])
	);
}

const encodeString = function(encodeObj, key, value){
	const stringBuffer = BufferLib.stringToBuffer(value);
	if (encodeObj.noDupeStrings && stringBuffer.length > 2){
		if (stringBuffer.length > 65535){
			let ptr = encodeObj.stringPtrs[value];
			if (ptr === undefined){
				encodeObj.newScope();
				encodeObj.dataArrayPush(
					BufferLib.from([scon.referencedValue])
				);
				encodeInt(encodeObj, null, stringBuffer.length, scon.utf8string8);
				encodeObj.dataArrayPush(stringBuffer);

				ptr = encodeObj.popScope();
				encodeObj.stringPtrs[value] = ptr;
			}
			encodeObj.dataArrayPush({
				pointsToValue: true,
				keyRef: false,
				ptr
			});
		}else{
			let ptr = encodeObj.keyPtrs[value];
			if (ptr === undefined){
				ptr = encodeObj.newKey(stringBuffer);
				encodeObj.keyPtrs[value] = ptr;
			}
			encodeObj.dataArrayPush({
				pointsToValue: true,
				keyRef: true,
				ptr
			});
		}
		encodeKey(encodeObj, 0, key);

		let ptr = encodeObj.keyPtrs[value];
		if (ptr === undefined){
			ptr = encodeObj.stringPtrs[value]
		}
	}else{
		encodeInt(encodeObj, key, stringBuffer.length, scon.utf8string8);
		encodeObj.dataArrayPush(stringBuffer);
	}
}

const encodeThing = function(encodeObj, key, value){
	switch( typeof value ){
		case "number":
			if ( value % 1 === 0 ){
				if (value >= 0){
					encodeInt(encodeObj, key, value, scon.uint8);
				}else{
					encodeInt(encodeObj, key, value, scon.int8);
				}
			}else{
				encodeDouble(encodeObj, key, value);
			}
		break;
		case "bigint":
			throw new Error("bigint support coming soon™");
		case "boolean":
			encodeKey(encodeObj, value ? scon.booltrue : scon.boolfalse, key);
		break;
		case "function":
			throw new Error("Cannot encode a function");
		case "object":
			if (value == null){
				encodeKey(encodeObj, scon.null, key);
			}else{
				if (encodeObj.circularObjects){
					let ptr = value.___SCON_POINTER;
					if (ptr === undefined){
						value.___SCON_POINTER = ptr = encodeObj.newScope();
						encodeObj.dataArrayPush(
							BufferLib.from([scon.referencedValue])
						);
						if(value instanceof Uint8Array){
							encodeBuffer(encodeObj, null, value);
						}else if(Array.isArray(value)){
							encodeArray(encodeObj, null, value);
						}else{
							encodeObject(encodeObj, null, value);
						}
					}
					encodeObj.dataArrayPush({
						pointsToValue: true,
						keyRef: false,
						ptr
					});
					encodeKey(encodeObj, 0, key);
				}else{
					if(value instanceof Uint8Array){
						encodeBuffer(encodeObj, key, value);
					}else if(Array.isArray(value)){
						encodeArray(encodeObj, key, value);
					}else{
						encodeObject(encodeObj, key, value);
					}
				}
			} 
		break;
		case "string":
			encodeString(encodeObj, key, value);
		break;
		case "symbol":
			throw new Error("Cannot encode a symbol");
		case "undefined":
			encodeObj.dataArrayPush(
				BufferLib.from([scon.undefined])
			);
		break;
	}
}



scon.encode = function(obj, options = {useMagicNumber: true}){
	if (typeof options === "boolean"){
		const useMagicNumber = options;
		options = {
			useMagicNumber
		};
	}
	const encodeObj = new InternalSconEncodeData(options);
	if (options.useMagicNumber || options.useMagicNumber == null){
		encodeObj.dataArrayPush(scon.magicNumberArr);
	}
	if (options.circularObjects){
		obj.___SCON_POINTER = 0;
		encodeObj.objects.push(obj);
		for (let k in obj){
			if (k === "___SCON_POINTER"){continue;}
			encodeThing(encodeObj, k, obj[ k ]);
		}
	}else{
		for (let k in obj){
			encodeThing(encodeObj, k, obj[ k ]);
		}
	}
	encodeObj.dataArrayPush(
		BufferLib.from([scon.endBlock])
	);
	if (options.circularObjects){
		for (let i = 0; i < encodeObj.objects.length; i +=1){
			delete encodeObj.objects[i].___SCON_POINTER;
		}
	}
	if (options.circularObjects || options.noDupeStrings){
		const baseObject = encodeObj.dataArrays.shift();
		for (let i = 0; i < encodeObj.keyArrayRefCount.length; i += 1){
			// 1 byte for total key length, 1 byte for NULL (pointer key), pointer length
			encodeObj.resultLen += (2 + uintByteLength(i)) * encodeObj.keyArrayRefCount[i];
		}
		for (let i = 0; i < encodeObj.dataArrayRefCount.length; i += 1){
			encodeObj.resultLen += uintByteLength(i) * encodeObj.dataArrayRefCount[i];
		}
		encodeObj.dataArrays.push(baseObject);
	}

	let finalBuffer = BufferLib.newBufferUnsafe(encodeObj.resultLen);

	let offset = 0;
	for (let i = 0; i < encodeObj.keyArray.length; i += 1){
		const keyArray = encodeObj.keyArray[i];
		for (let ii = 0; ii < keyArray.length; ii += 1){
			const buff = keyArray[ii];
			finalBuffer.set(buff, offset);
			offset += buff.length;
		}
	}
	for (let i = 0; i < encodeObj.dataArrays.length; i += 1){
		const dataArray = encodeObj.dataArrays[i];
		for (let ii = 0; ii < dataArray.length; ii += 1){
			const buff = dataArray[ii];
			if (buff instanceof Uint8Array){
				finalBuffer.set(buff, offset);
				offset += buff.length;
			}else{
				if (buff.pointsToValue){
					let valPtr = buff.ptr;
					if (valPtr !== 0 && !buff.keyRef){
						valPtr += encodeObj.keyArray.length;
					}
					let newBuff = dataArray[ii+=1];
					const ptrBuffer = encodeInt(encodeObj, null, valPtr, null); 
					newBuff[0] |= (scon.valuePointer0 + ptrBuffer.length);
					finalBuffer.set(newBuff, offset);
					offset += newBuff.length;
					if (newBuff.length === 1){
						// This means that the next object is a pointer to a key
						newBuff = dataArray[ii+=1];
						if (newBuff.pointsToValue || newBuff instanceof Uint8Array){
							// Or we could be in an array
							ii-=1;
						}else{
							const keyPtrBuffer = encodeInt(encodeObj, null, newBuff.ptr, null); 
							finalBuffer[offset++] = keyPtrBuffer.length + 1;
							finalBuffer[offset++] = 0;
							finalBuffer.set(keyPtrBuffer, offset);
							offset += keyPtrBuffer.length;
						}
						finalBuffer.set(ptrBuffer, offset);
						offset += ptrBuffer.length;
					}else{
						// This means that the next object is the a buffer representing the key
						newBuff = dataArray[ii+=1];
						finalBuffer.set(newBuff, offset);
						offset += newBuff.length;
						finalBuffer.set(ptrBuffer, offset);
						offset += ptrBuffer.length;
					}

				}else{
					const keyPtrBuffer = encodeInt(encodeObj, null, buff.ptr, null); 
					finalBuffer[offset++] = keyPtrBuffer.length + 1;
					finalBuffer[offset++] = 0;
					finalBuffer.set(keyPtrBuffer, offset);
					offset += keyPtrBuffer.length;
				}
			}
		}
	}
	//finalBuffer[offset++] = 0;
	return finalBuffer.subarray(0, offset);
}

module.exports = scon;
