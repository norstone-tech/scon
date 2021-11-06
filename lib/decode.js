/**
 * Swift-Cardinal Object Notation
 * https://github.com/norstone-tech/scon
 *
 * Copyright (c) BlueStone Technological Enterprises Inc., 2016-2019
 * Copyright (c) Norstone Technologies 2021
 * Licensed under the GNU GPLv3 license.
 */

"use strict";
/**
 * @private
 * @typedef {import("buffer").Buffer} TypedefWorkaroundBuffer
 */
const {MAGIC_NUMBER, BASE_TYPES, HEADER_BYTE, EXTENDED_TYPES, VARINT_EXTEND, VARINT_VALUE, EXTENDED_TYPE_USER} = require("./conf");
const {
	SconParseError,
	SconMagicNumberError,
	SconCircularError,
	SconInvalidKeyError,
	SconReferenceError,
	SconTruncateError
} = require("./error");
/* Any varints which take up more bytes than this will need to use BigInts to decode as JS can't do positive bitshifts
   larger than 2 ** 31 - 1 */
const MAX_SAFE_BITSHIFT_READ_BYTES = Math.floor((2 ** 31 - 1).toString(2).length / 7);

const MAX_SAFE_MULTIPLY_READ_BYTES = Math.floor(Number.MAX_SAFE_INTEGER.toString(2).length / 7)

const {checkExtendedIntRange} = require("./shared");
/**
 * @typedef SconDecodeOptions
 * @property {boolean} [magicNumber=true] Expect for the data to be prepended with a SCON3 identifier
 * @property {boolean} [copyOnBufferRead=false] If true, any Buffer values will have their own memory space,
 * instead of being a sub-array referencing the Buffer being decoded. (slightly increases parse time) You should set
 * this to true if you are parsing a large object or plan to keep the resulting Buffer values for a while
 * @property {boolean} [keepReferenceValues=false] If true, the internal table of referenced values will not be cleared
 * When decoding multiple buffers. You may use this if you intend to split your values across multiple outputs
 */
/**@type {SconDecodeOptions} */
const DEFAULT_OPTIONS = {
	magicNumber: true,
	copyOnBufferRead: false,
	keepReferenceValues: false
};
const MAP_CONSTRUCT_VALUE = Symbol("MAP_CONSTRUCT_VALUE");
class SconDecoder {
	constructor(options = {}){
		/**
		 * @type {SconDecodeOptions}
		 * Decoding options. This can be changed at runtime without worry. Note that this object a _copy_ from the one
		 * given in the constructor.
		 */
		this.options = Object.assign(Object.create(DEFAULT_OPTIONS), options);
		/**
		 * @private
		 * @type {any[]}
		 */
		this._referencedValues = [];
		/**
		 * @type {any}
		 * The current result of decoding
		 */
		this.result = undefined;
		/**
		 * @private
		 * @type {any[]}
		 */
		this._nestObj = [];
		/**
		 * currently unused until user-extended types are supported
		 * @private
		 * @type {number[]}
		 */
		this._nestExtType = [];
		/**
		 * @private
		 * @type {any}
		 */
		this._curObj = this.result;
		/**
		 * currently unused until user-extended types are supported
		 * @private
		 * @type {number}
		 */
		this._curExtType = 0;

		/**
		 * @private
		 * @type {Buffer}
		 */
		this._buffer = Buffer.allocUnsafe(0);
		/**
		 * @private
		 * @type {number}
		 */
		this._i = 0;
		/**
		 * @private
		 * @type {number}
		 */
		this._resumeI = 0;
		this.complete = true;
	}
	_isParsingArray(){
		return this._curObj instanceof Array || this._curObj instanceof Set;
	}
	_addValue(key, value){
		if(key === undefined){
			this.result = value;
			return;
		}
		if(this._curObj instanceof Array){
			this._curObj.push(value);
		}else if(this._curObj instanceof Set){
			this._curObj.add(value);
		}else if(this._curObj instanceof Map){
			this._curObj.set(key, value);
		}else if(Object.prototype[key] === undefined){
			this._curObj[key] = value;
		}
	}
	/**
	 * @param {boolean} [isNegative = false]
	 * @param {number} [extendedType = 0]
	 * @returns {number | BigInt}
	 */
	_parseVarInt(isNegative = false, extendedType = 0){
		let readBytes = 0;
		/**@type {number | BigInt} */
		let result = 0;
		/**@type {number} */
		let curVal;
		do{
			if(this._i >= this._buffer.length){
				throw new SconTruncateError();
			}
			curVal = this._buffer[this._i++];
			readBytes += 1;
			if(readBytes <= MAX_SAFE_BITSHIFT_READ_BYTES){
				// Fastest decoding method
				result = (result << 7) | (curVal & VARINT_VALUE);
			}else if(readBytes <= MAX_SAFE_MULTIPLY_READ_BYTES){
				// Less than half the speed as above
				result = (result * 128) + (curVal & VARINT_VALUE);
			}else{
				// We're basically turtles now
				result = (BigInt(result) << 7n) | BigInt(curVal & VARINT_VALUE);
			}
			
		}while(curVal & VARINT_EXTEND);
		if(isNegative){
			result *= readBytes <= MAX_SAFE_MULTIPLY_READ_BYTES ? -1 : -1n;
		}
		checkExtendedIntRange(result, extendedType, SconParseError);
		if(result >= EXTENDED_TYPES.INT_VAR.SINT256 && result <= EXTENDED_TYPES.INT_VAR.UINT64){
			return BigInt(result);
		}else if(result >= EXTENDED_TYPES.INT_VAR.SINT32 && result <= EXTENDED_TYPES.INT_VAR.UINT8){
			return Number(result);
		}
		switch(extendedType){
			case EXTENDED_TYPES.INT_VAR.FLOAT_64_SAFE_INT:
				return Number(result);
			case EXTENDED_TYPES.INT_VAR.DATE_S:
				return new Date(Number(result) * 1000);
			case EXTENDED_TYPES.INT_VAR.DATE_MS:
				return new Date(Number(result));
			case EXTENDED_TYPES.INT_VAR.INF_INT:
				// Falls through			
			default:
				return BigInt(result);
		}
	}
	/**
	 * @private
	 * @param {boolean} [isUtf8 = false]
	 * @param {boolean} [copy = false]
	 * @returns {string | Buffer}
	 */
	_parseNullTermString(isUtf8 = false, copy = false){
		const start = this._i;
		while(this._buffer[this._i++]){
			if(this._i >= this._buffer.length){
				throw new SconTruncateError();
			}
		}
		const end = this._i - 1; // Don't include the null byte in the result
		if(isUtf8){
			return this._buffer.toString("utf8", start, end);
		}
		if(copy){
			return Uint8Array.prototype.slice.call(this._buffer, start, end);
		}
		return this._buffer.subarray(start, end);
	}
	/**
	 * @private
	 * @param {boolean} [isUtf8 = false]
	 * @param {boolean} [copy = false]
	 * @returns {string | Buffer}
	 */
	_parseLengthPrefixedString(isUtf8 = false, copy = false){
		const length = this._parseVarInt();
		const start = this._i;
		const end = this._i += length;
		if(end >= this._buffer.length){
			throw new SconTruncateError();
		}
		if(isUtf8){
			return this._buffer.toString("utf8", start, end);
		}
		if(copy){
			return Uint8Array.prototype.slice.call(this._buffer, start, end);
		}
		return this._buffer.subarray(start, end);
	}
	/**
	 * @private
	 */
	_decode(rootValue = false){
		while(true){
			this._resumeI = this._i;
			const headerByte = this._buffer[this._i++];
			const baseType = headerByte & HEADER_BYTE.BASE_TYPES;
			if(baseType === BASE_TYPES.EOF){
				if(!this._nestObj.length){
					break;
				}
				if(this._curObj[MAP_CONSTRUCT_VALUE]){
					/**@type {[any, any][]} */
					const arrayOfKeyValues = this._curObj;
					/**@type {Map} */
					const map = this._nestObj.pop();
					for(let i = 0; i < arrayOfKeyValues.length; i += 1){
						map.set(...arrayOfKeyValues[i]);
					}
				}
				this._curObj = this._nestObj.pop();
				// this._curExtType = this._nestExtType.pop();
				continue;
			}
			const isReferenceDefinition = (headerByte & HEADER_BYTE.IS_REFERENCE_DEFINITION) > 0;
			const keyIsReference = (headerByte & HEADER_BYTE.KEY_IS_REFERENCE) > 0;
			const valueIsReference = (headerByte & HEADER_BYTE.VALUE_IS_REFERENCE) > 0;
			const typeVariant = (headerByte & HEADER_BYTE.BASE_TYPE_VARIANT) > 0;
			const extendedType = (headerByte & HEADER_BYTE.HAS_EXTENDED_TYPE) ? this._buffer[this._i ++] : 0;
			/**@type {number | string} */
			let keyValue;
			if(isReferenceDefinition){
				keyValue = keyIsReference ? this._parseVarInt() : this._referencedValues.length;
			}else if(rootValue){
				rootValue = false;
			}if(!Array.isArray(this._curObj)){
				if(keyIsReference){
					const refIndex = this._parseVarInt();
					if(refIndex >= this._referencedValues.length){
						throw new SconReferenceError();
					}
					keyValue = this._referencedValues[refIndex];
					if(typeof keyValue !== "string" || keyValue.includes("\0")){
						throw new SconReferenceError("Key reference must point to a string w/o null chars");
					}
				}else{
					keyValue = this._parseNullTermString(true);
				}
			}
			if(extendedType >= EXTENDED_TYPE_USER){
				throw new SconParseError("Cannot parse user-extended types");
			}
			let value;
			if(valueIsReference){
				const refIndex = this._parseVarInt();
				if(refIndex >= this._referencedValues.length){
					throw new SconReferenceError();
				}
				value = this._referencedValues[refIndex];
			}else{
				switch(baseType){
					case BASE_TYPES.NULL:
						value = null;
						break;
					case BASE_TYPES.BOOLEAN:
						value = typeVariant;
						break;
					case BASE_TYPES.FLOAT_FIXED:
						if(typeVariant){
							value = this._buffer.readDoubleLE(this._i);
							this._i += 8;
						}else{
							value = this._buffer.readFloatLE(this._i);
							this._i += 4;
						}
						break;
					case BASE_TYPES.INT_VAR:
						value = this._parseVarInt(typeVariant, extendedType);
						break;
					case BASE_TYPES.STRING_ZERO_TERM:
						value = this._parseNullTermString(typeVariant, this.options.copyOnBufferRead);
						break;
					case BASE_TYPES.STRING_LENGTH_PREFIXED:
						value = this._parseLengthPrefixedString(typeVariant, this.options.copyOnBufferRead);
						break;
					case BASE_TYPES.OBJECT:
						if(typeVariant){
							switch(extendedType){
								case EXTENDED_TYPES.OBJECT.SET:
									value = new Set();
									break;
								case EXTENDED_TYPES.OBJECT.ANY_KEY_MAP:
									value = new Map();
									break;
							}
						}else{
							switch(extendedType){
								case EXTENDED_TYPES.OBJECT.STRING_KEY_MAP_ALT:
								case EXTENDED_TYPES.OBJECT.STRING_KEY_MAP:
									value = new Map();
									break;
								default:
									value = {};
							}
						}
						break;
					default:
						// Literally impossible. 3 bits can't go beyond 7
				}
			}
			if(isReferenceDefinition){
				this._referencedValues[keyValue] = value;
			}else{
				this._addValue(keyValue, value);
			}
			if(typeof value === "object" && value !== null){
				this._nestObj.push(this._curObj);
				// this._nestExtType.push(this._curExtType);
				this._curObj = value;
				// this._curExtType = extendedType;
				if(value instanceof Map && extendedType == EXTENDED_TYPES.OBJECT.ANY_KEY_MAP){
					// We need to handle the "interpret this array as an array of key value pairs" case
					const arrayForConstructing = [];
					arrayForConstructing[MAP_CONSTRUCT_VALUE] = true;
					this._nestObj.push(this._curObj);
					this._curObj = arrayForConstructing;
				}
			}
		}
		this._resumeI = this._i;
	}
	/**
	 * @template T
	 * @param {import("./shared").SconEncodedBufferOf<T> | Buffer | Uint8Array} buffer
	 * @returns {T}
	 */
	decode(buffer){
		if(!this.complete){
			throw new SconParseError("Cannot do a full decode while doing a partial decode");
		}
		if(!this.options.keepReferenceValues){
			this._referencedValues.length = 0;
		}
		if(buffer instanceof Buffer){
			this._buffer = buffer;
		}else{
			this._buffer = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.length);
		}
		if(this.options.magicNumber){
			if(!this._buffer.slice(0, MAGIC_NUMBER.length).equals(MAGIC_NUMBER)){
				throw new SconMagicNumberError();
			}
			this._i = MAGIC_NUMBER.length;
			this._resumeI = this._i;
		}
		this._decode(true);
		const result = this.result;
		this.result = undefined;
		this._curObj = null;
		this._i = 0;
		this._resumeI = 0;
		if(!this.options.keepReferenceValues){
			this._referencedValues.length = 0;
		}
		return result;
	}
	/**
	 * @param {Buffer | Uint8Array} buffer
	 * @returns {Object<string, any> | null}
	 */
	decodePartial(buffer){
		this._i = this._resumeI;
		if(this._i < this._buffer.length){
			this._buffer = Buffer.concat([this._buffer.slice(this._i), buffer]);
		}else{
			this._buffer = buffer instanceof Buffer ?
				buffer :
				Buffer.from(buffer.buffer, buffer.byteOffset, buffer.length);
		}
		this._i = 0;
		let result = undefined;
		try{
			if(this.complete && this.options.magicNumber){
				if(!this._buffer.slice(0, MAGIC_NUMBER.length).equals(MAGIC_NUMBER)){
					throw new SconMagicNumberError();
				}
				this._i = MAGIC_NUMBER.length;
			}
			const rootValue = this.complete;
			this.complete = false;
			this._decode(rootValue);
			if(!this.options.keepReferenceValues){
				this._referencedValues.length = 0;
			}
			result = this.result;
			this.result = undefined;
			this._curObj = null;
			this.complete = true;
		}catch(ex){
			if(!(ex instanceof SconTruncateError)){
				this.result = undefined;
				this._curObj = null;
				this._buffer = Buffer.allocUnsafe(0);
				this._i = 0;
				this._resumeI = 0;
				this.complete = true;
				throw ex;
			}
		}
		return result;
	}
}
const defaultDecoder = new SconDecoder();
/**
 * Decode SCON data, using only the default options
 * @template T
 * @param {import("./shared").SconEncodedBufferOf<T> | Buffer | Uint8Array} buffer
 * @returns {T}
 */
const decode = function(buffer){
	return defaultDecoder.decode(buffer);
}
module.exports = {
	SconDecoder
};
