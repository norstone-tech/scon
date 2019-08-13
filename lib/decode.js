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
const sconUtil = require("./util.js");

sconUtil.loadSubmodule(scon, "lib/conf.js");
sconUtil.loadSubmodule(scon, "lib/error.js");

// Pointer decode note:
/*
 * const k = key;
 * const p = ptr;
 * Object.defineProperty(obj, k, {
 * get: function() {
 * delete this[k];
 * return this[k] = pointedData[p];
 * }
 * set: function() {
 * delete this[k];
 * return this[k] = pointedData[p];
 * }
 * });
 *
 */

class InternalSconDecodeData {
	constructor(buff, cb, sync){
		this.buff = buff;
		this.offset = 0;

		const rootObject = {};

		this.pointedData = [rootObject];

		this.decodedObjects = [rootObject];
		this.scopeArray = [0];

		this.callback = cb;

		this.sync = Boolean(sync);
		this.functionToCallAfterDecreasingStackSize;
		this.functionToCallAfterDecreasingStackSizeArgs;
	}
	get decodedObject(){
		return this.decodedObjects[this.decodedObjects.length - 1];
	}
	newScope(){
		const newObj = {};
		this.decodedObjects.push(newObj);
		return newObj;
	}
	popScope(){
		return this.decodedObjects.pop();
	}
	callbackRead(len, cb){
		const endOffset = this.offset + len;
		if(endOffset <= this.buff.length){
			const subBuffer = this.buff.subarray(this.offset, endOffset);
			this.offset = endOffset;
			if(this.sync){
				this.functionToCallAfterDecreasingStackSize = cb;
				this.functionToCallAfterDecreasingStackSizeArgs = [ null, subBuffer ];
			}else{
				setTimeout(() => {
					cb(null, subBuffer);
				}, 0);
			}
		}else{
			setTimeout(async() => {
				try{
					let buff;
					const buffs = [this.buff.subarray(this.offset)];
					let totalLength = buffs[0].length;
					while(totalLength < len){
						buff = await this.callback(len - totalLength);
						buffs.push(buff);
						totalLength += buff.length;
					}
					buff = BufferLib.concat(buffs, totalLength);
					this.buff = buff.subarray(len);
					this.offset = 0;
					cb(null, buff.subarray(0, len));
				}catch(ex){
					cb(ex);
				}
			}, 0);
		}
	}
}

// These 2 functions are copied from NodeJS's buffer object
const readInt = function(buff){
	const byteLength = buff.length;
	let i = byteLength;
	let mul = 1;
	let val = buff[--i];
	while(i > 0 && (mul *= 0x100)){
		val += buff[--i] * mul;
	}

	mul *= 0x80;
	if(val >= mul){
		val -= Math.pow(2, 8 * byteLength);
	}
	return val;
};
const readUInt = function(buff){
	let byteLength = buff.length;
	let val = buff[--byteLength];
	let mul = 1;
	while(byteLength > 0 && (mul *= 0x100)){
		val += buff[--byteLength] * mul;
	}
	return val;
};

const readKey = function(decodeObj, longKey, cb){
	decodeObj.callbackRead(longKey ? 2 : 1, (err, keyLengthBuff) => {
		if(err){
			cb(err);
			return;
		}
		let keyLength = keyLengthBuff[longKey ? 1 : 0];
		if(longKey){
			keyLength |= keyLengthBuff[0] << 8;
		}
		decodeObj.callbackRead(keyLength, (err, keyNameBuff) => {
			try{
				if(err)throw err;
				let key;
				if(keyNameBuff[0] === 0){
					const ptr = readUInt(keyNameBuff.subarray(1));
					key = decodeObj.pointedData[ptr];
					if(key === undefined){
						throw new scon.Error("undefinedKey");
					}
				}else{
					key = BufferLib.bufferToString(keyNameBuff);
				}
				cb(null, key);
			}catch(ex){
				cb(ex);
			}
		});
	});
};

const applyPointedValue = function(decodeObj, key, array, ptr, cb){
	try{
		let obj;
		let k;

		const p = ptr;
		const pointedData = decodeObj.pointedData;
		if(key === undefined){
			obj = array;
			k = array.length;
		}else{
			obj = decodeObj.decodedObject;
			k = key;
		}
		// We don't know what the pointed value is yet, so we can use JavaScript-Magic™ so that once we pass the object to the consumer, it will be there.
		Object.defineProperty(obj, k, {
			get(){
				delete this[k];
				return this[k] = pointedData[p];
			},
			set(v){
				delete this[k];
				return this[k] = v;
			},
			configurable: true,
			enumerable: true
		});
		cb(null);
	}catch(ex){
		// I have no idea if Object.defineProperty ever throws, I just like having my bases covered
		/* istanbul ignore next */
		cb(ex);
	}
};

const applyDecodedValue = function(decodeObj, key, array, value, cb){
	if(key === undefined){
		array.push(value);
	}else{
		decodeObj.decodedObject[key] = value;
	}
	cb(null);
};

const decodeArray = function(decodeObj, key, array, newArray, i, len, cb){
	if(i >= len){
		applyDecodedValue(decodeObj, key, array, newArray, cb);
		return;
	}
	decodeObj.callbackRead(1, (err, dataType) => {
		try{
			if(err)throw err;
			decodeValue(decodeObj, dataType[0] & 127, undefined, newArray, (err) => {
				if(err){
					cb(err);
				}else{
					decodeArray(decodeObj, key, array, newArray, i + 1, len, cb);
				}
			});
		}catch(ex){
			cb(ex);
		}
	});
};

const decodeValue = function(decodeObj, dataType, key, array, cb){
	switch(dataType){
		case scon.compound:
			decodeObj.newScope();
			decodeObject(decodeObj, (err) => {
				if(err){
					cb(err);
				}else{
					applyDecodedValue(decodeObj, key, array, decodeObj.popScope(), cb);
				}
			});
			break;
		case scon.undefined:
			applyDecodedValue(decodeObj, key, array, undefined, cb);
			break;
		case scon.null:
			applyDecodedValue(decodeObj, key, array, null, cb);
			break;
		case scon.boolfalse:
			applyDecodedValue(decodeObj, key, array, false, cb);
			break;
		case scon.booltrue:
			applyDecodedValue(decodeObj, key, array, true, cb);
			break;
		case scon.boolean:
			decodeObj.callbackRead(1, (err, b) => {
				if(err){
					cb(err);
				}else{
					applyDecodedValue(decodeObj, key, array, b[0] !== 0, cb);
				}
			});
			break;
		case scon.nan:
			applyDecodedValue(decodeObj, key, array, NaN, cb);
			break;
		case scon.floatInf:
			applyDecodedValue(decodeObj, key, array, Infinity, cb);
			break;
		case scon.floatNegInf:
			applyDecodedValue(decodeObj, key, array, -Infinity, cb);
			break;
		case scon.float32:
			decodeObj.callbackRead(4, (err, floatSlice) => {
				try{
					if(err)throw err;
					const floatBuffer = BufferLib.allocUnsafeSlow(4);
					floatBuffer.set(floatSlice);
					floatBuffer.reverse();
					applyDecodedValue(decodeObj, key, array, (new Float32Array(floatBuffer.buffer))[0], cb);
				}catch(ex){
					cb(ex);
				}
			});
			break;
		case scon.float64:
			decodeObj.callbackRead(8, (err, floatSlice) => {
				try{
					if(err)throw err;
					const floatBuffer = BufferLib.allocUnsafeSlow(8);
					floatBuffer.set(floatSlice);
					floatBuffer.reverse();
					applyDecodedValue(decodeObj, key, array, (new Float64Array(floatBuffer.buffer))[0], cb);
				}catch(ex){
					cb(ex);
				}
			});
			break;
		case scon.uint0:
		case scon.int0:
			applyDecodedValue(decodeObj, key, array, 0, cb);
			break;
		case scon.utf8string0:
			applyDecodedValue(decodeObj, key, array, "", cb);
			break;
		case scon.array0:
			applyDecodedValue(decodeObj, key, array, [], cb);
			break;
		case scon.string0:
			applyDecodedValue(decodeObj, key, array, BufferLib.alloc(0), cb);
			break;
		case scon.valuePointer0:
			applyDecodedValue(decodeObj, key, array, decodeObj.decodedObjects[0], cb);
			break;
		default:{
			let defaultValue;
			if(dataType <= scon.uint64 && dataType >= scon.uint8){
				defaultValue = scon.uint0;
			}else if(dataType <= scon.int64 && dataType >= scon.int8){
				defaultValue = scon.int0;
			}else if(dataType <= scon.utf8string64 && dataType >= scon.utf8string8){
				defaultValue = scon.utf8string0;
			}else if(dataType <= scon.array64 && dataType >= scon.array8){
				defaultValue = scon.array0;
			}else if(dataType <= scon.string64 && dataType >= scon.string8){
				defaultValue = scon.string0;
			}else if(dataType <= scon.valuePointer32 && dataType >= scon.valuePointer8){
				defaultValue = scon.valuePointer0;
			}
			if(defaultValue === undefined){
				cb(new scon.Error("unknownObjectType", dataType));
				return;
			}
			decodeObj.callbackRead(dataType - defaultValue, (err, intBuffer) => {
				try{
					if(err)throw err;
					if(defaultValue === scon.int0){
						applyDecodedValue(decodeObj, key, array, readInt(intBuffer), cb);
					}else{
						const int = readUInt(intBuffer);
						switch(defaultValue){
							case scon.uint0:
								applyDecodedValue(decodeObj, key, array, int, cb);
								break;
							case scon.utf8string0:
								decodeObj.callbackRead(int, (err, stringBuffer) => {
									try{
										if(err)throw err;
										applyDecodedValue(
											decodeObj,
											key,
											array,
											BufferLib.bufferToString(stringBuffer),
											cb
										);
									}catch(ex){
										cb(ex);
									}
								});
								break;
							case scon.array0:
								decodeArray(decodeObj, key, array, [], 0, int, cb);
								break;
							case scon.string0:
								decodeObj.callbackRead(int, (err, bufferSlice) => {
									try{
										if(err)throw err;
										const newBuffer = BufferLib.allocUnsafeSlow(int);
										newBuffer.set(bufferSlice);
										applyDecodedValue(decodeObj, key, array, newBuffer, cb);
									}catch(ex){
										cb(ex);
									}
								});
								break;
							case scon.valuePointer0:{
								const value = decodeObj.pointedData[int];
								if(value === undefined){
									applyPointedValue(decodeObj, key, array, int, cb);
								}else{
									applyDecodedValue(decodeObj, key, array, value, cb);
								}
							}
							default:
								// This will never happen
						}
					}
				}catch(ex){
					cb(ex);
				}
			});
		}
	}
};

const decodeObject = function(decodeObj, cb){
	decodeObj.callbackRead(1, (err, dataType) => {
		try{
			if(err)throw err;
			dataType = dataType[0];
			if(dataType === scon.endBlock){
				cb(null);
				return;
			}
			const shortKey = Boolean(dataType & 128);
			if(shortKey){
				dataType ^= 128;
			}
			if(dataType === scon.referencedKey){
				readKey(decodeObj, !shortKey, (err, key) => {
					if(err){
						cb(err);
					}else{
						decodeObj.pointedData.push(key);
						decodeObject(decodeObj, cb);
					}
				});
			}else if(dataType === scon.referencedValue){
				decodeObj.callbackRead(1, (err, dataType) => {
					if(err){
						cb(err);
					}else{
						decodeValue(decodeObj, dataType[0] & 127, undefined, decodeObj.pointedData, (err) => {
							if(err){
								cb(err);
							}else{
								decodeObject(decodeObj, cb);
							}
						});
					}
				});
			}else{
				readKey(decodeObj, !shortKey, (err, key) => {
					if(err){
						cb(err);
					}else{
						decodeValue(decodeObj, dataType, key, undefined, (err) => {
							if(err){
								cb(err);
							}else{
								decodeObject(decodeObj, cb);
							}
						});
					}
				});
			}
		}catch(ex){
			cb(ex);
		}
	});
};

const checkMagicNumber = function(decodeObj, cb){
	decodeObj.callbackRead(scon.magicNumberArr.length, (err, potentialMagicNumber) => {
		try{
			if(err)throw err;
			for(let i = 0; i < potentialMagicNumber.length; i += 1){
				if(scon.magicNumberArr[i] != potentialMagicNumber[i]){
					throw new scon.Error("noMagicNumber");
				}
			}
			decodeObject(decodeObj, cb);
		}catch(ex){
			cb(ex);
		}
	});
};

scon.decode = function(buff, options = {useMagicNumber: true}){
	if(typeof options === "boolean"){
		const useMagicNumber = options;
		options = {useMagicNumber};
	}
	const decodeObj = new InternalSconDecodeData(buff, () => Promise.reject(new Error("This should never happen")), true);
	let lastErr;
	const cb = function(err){
		lastErr = err;
	};
	if(options.useMagicNumber || options.useMagicNumber == null){
		checkMagicNumber(decodeObj, cb);
	}else{
		decodeObject(decodeObj, cb);
	}
	while(decodeObj.functionToCallAfterDecreasingStackSize != null){
		const func = decodeObj.functionToCallAfterDecreasingStackSize;
		const args = decodeObj.functionToCallAfterDecreasingStackSizeArgs;
		delete decodeObj.functionToCallAfterDecreasingStackSize;
		delete decodeObj.functionToCallAfterDecreasingStackSizeArgs;
		func(...args);
	}
	if(lastErr === undefined){
		throw new scon.Error("endOfFileTooSoon");
	}else if(lastErr != null){
		throw lastErr;
	}
	return decodeObj.decodedObject;
};

scon.decodeAsync = function(buff, options = {useMagicNumber: true}, requestData){
	return new Promise((resolve, reject) => {
		if(typeof options === "boolean"){
			const useMagicNumber = options;
			options = {useMagicNumber};
		}
		const decodeObj = new InternalSconDecodeData(buff, requestData);
		const cb = function(err){
			if(err){
				reject(err);
			}else{
				resolve({
					result: decodeObj.decodedObject,
					leftover: decodeObj.buff.subarray(decodeObj.offset)
				});
			}
		};
		if(options.useMagicNumber || options.useMagicNumber == null){
			checkMagicNumber(decodeObj, cb);
		}else{
			decodeObject(decodeObj, cb);
		}
	});
};

module.exports = scon;
