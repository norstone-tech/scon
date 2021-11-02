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
const {MAGIC_NUMBER, HEADER_BYTE, BASE_TYPES, EXTENDED_TYPES} = require("./conf");
const {SconUnserializableError, SconSerializeError, SconInvalidKeyError} = require("./error");
const {checkExtendedIntRange} = require("./shared");
class ExtendedBufArray extends Array {
	constructor(...args){
		super(...args);
		this.totalBufLength = 0;
	}
	push(){
		Array.prototype.push.call(this, ...arguments)
	}
}

/**
 * @typedef SconEncodeOptions
 * @property {boolean} [magicNumber=true] Prepend the output with the SCON3 identifier
 * @property {boolean} [referencedObjects=false] If true, all object values will be referenced. Slightly increases
 * output size and encode time. You should really only use this if you intend to encode circular objects
 * @property {boolean} [referencedStrings=false] If true, all strings will be referenced. Slightly increases encoding
 * time, but decreases output size in the vast majority of cases
 * @property {boolean} [throwOnUnknownObject=false] If true, this will throw if an object's type is unknown or isn't a
 * "pure" object. If false, any "unknown" object will be encoded as a regular object using said objects enumerable
 * properties
 * @property {boolean} [keepReferenceValues=false] If true, the internal table of referenced values will not be cleared
 * When encoding multiple objects. You may use this if you intend to split your values across multiple outputs
 * @property {boolean} [explicitReferenceDefinition=false] You should always set this to `true` after setting
 * `keepReferenceValues` to false if it was previously `true`
 * @property {boolean} [anyMapKey=false] Allows for the keys of a `Map` object to be non-strings.
 * @property {boolean} [smallerFloats=true] Encode floats using 32-bits instead of 64-bits if it can be done without
 * losing accuracy
 * @property {number} [intExtendedType=0]
 * How integers should be encoded
 * @property {number} [bigIntExtendedType=16]
 * How BigInts should be encoded
 */
/**@type {SconEncodeOptions} */
const DEFAULT_OPTIONS = {
	magicNumber: true,
	referencedObjects: false,
	referencedStrings: false,
	throwOnUnknownObject: false,
	keepReferenceValues: false,
	explicitReferenceDefinition: false,
	anyMapKey: false,
	intExtendedType: EXTENDED_TYPES.INT_VAR.FLOAT_64_SAFE_INT,
	bigIntExtendedType: EXTENDED_TYPES.INT_VAR.INF_INT
};
const OBJECT_REFERENCE_NUM = Symbol("OBJECT_REFERENCE_NUM");
const MAX_SAFE_BITSHIFT_VALUE = 2 ** 31 - 1;
const singleFloatChecker = new Uint32Array(1);
const canUseFloat32 = function(/**@type {number} */ num){
	if(isNaN(num)){
		return true;
	}
	singleFloatChecker[0] = num;
	return num === singleFloatChecker[0];
}

const numOfBits = (/**@type {number | BigInt}*/ num) => {
	if(typeof num === "bigint"){
		// Feedback is appreciated for this. Unironically the most performant way I found
		return num.toString(2).length;
	}else{
		return num == 0 ? 1 : Math.floor(Math.log2(num)) + 1;
	}
}
const varIntLen = (/**@type {number | BigInt}*/ num) => Math.ceil(Math.ceil(numOfBits(num) * 8 / 7) / 8);
const varIntToBuffer = function(/**@type {number | BigInt}*/ val){
	const buf = Buffer.allocUnsafe(varIntLen(val));
	if(typeof val === "bigint"){
		for(let i = buf.length - 1; i >= 0; i -= 1){
			buf[i] = Number(val & 0b01111111n) | 0b10000000;
			val >>= 7n;
		}
		// The last byte actually needs its highest bit 0 to signify end-of-varint
		buf[buf.length - 1] &= 0b01111111;
	}else{
		for(let i = buf.length - 1; i >= 0; i -= 1){
			buf[i] = val & 0b01111111 | 0b10000000;
			if(val > MAX_SAFE_BITSHIFT_VALUE){
				val = Math.floor(val / 128);
			}else{
				val >>= 7;
			}
		}
		// The last byte actually needs its highest bit 0 to signify end-of-varint
		buf[buf.length - 1] &= 0b01111111;
	}
	return buf;
}
class SconEncoder {
	/**
	 * @param {SconEncodeOptions} [options = {}]
	 */
	constructor(options = {}){
		/**
		 * @type {SconEncodeOptions}
		 * Encoding options. This can be changed at runtime without worry. Note that this object a _copy_ from the one
		 * given in the constructor.
		 */
		this.options = Object.assign(Object.create(DEFAULT_OPTIONS), options);

		/**
		 * @private
		 * @type {Map<string, number>}
		 */
		this._stringRefNums = new Map();

		/**
		 * @private
		 * @type {number}
		 */
		this._curRefNum = 0;

		/**
		 * @private
		 * @type {Array<Buffer>}
		 */
		this._referenceBufs = [];
		/**
		 * @private
		 * @type {Array<Buffer>}
		 */
		this._encodedBufs = [];

		/**
		 * @private
		 * @type {any[]}
		 */
		this._seenObjects = [];
	}
	/**
	 * @private
	 * @param {number} headerByte
	 * @param {number} extendedType
	 * @param {any} value
	 * @returns {}
	 */
	_createRefObjectBufs(headerByte, extendedType, value){
		const refNum = this._curRefNum ++;
		value[OBJECT_REFERENCE_NUM] = refNum;
		this._seenObjects.push(value);
		/**@type {Buffer[]} */
		const refBufs = [];
		refBufs.push(Buffer.alloc(
			1, 
			headerByte |
			HEADER_BYTE.IS_REFERENCE_DEFINITION |
			(this.options.explicitReferenceDefinition ? HEADER_BYTE.KEY_IS_REFERENCE_SLOT : 0) |
			(extendedType ? HEADER_BYTE.HAS_EXTENDED_TYPE : 0)
		));
		if(extendedType){
			refBufs.push(Buffer.alloc(1, extendedType));
		}
		if(this.options.explicitReferenceDefinition){
			refBufs.push(varIntToBuffer(refNum));
		}
		return refBufs;
	}

	/**
	 * @private
	 * @param {Array | Set} value
	 * @returns {Buffer[]}
	 */
	_encodeArrayBody(value){
		const result = [];
		if(Array.isArray(value)){
			for(let i = 0; i < value.length; i +=1){
				result.push(...this._encodeKeyValuePair(null, value[i]));
			}
		}else{
			for(const innerVal of value){
				result.push(...this._encodeKeyValuePair(null, innerVal));
			}
		}
		result.push(Buffer.alloc(1)); // end of array
		return result;
	}
	/**
	 * @param {Object<string, any> | Map<any, any>} value 
	 * @returns {Buffer[]}
	 */
	_encodeMapBody(value){
		const result = [];
		if(value instanceof Map){
			if(this.options.anyMapKey){
				// This is actually almost twice as fast as Map#entries()!
				value.forEach((val, key) => {
					result.push(
						Buffer.alloc(1, BASE_TYPES.OBJECT | HEADER_BYTE.BASE_TYPE_VARIANT), // Array
						...this._encodeKeyValuePair(null, key),
						...this._encodeKeyValuePair(null, val),
						result.push(Buffer.alloc(1)) // End of Array of 2 elements (key/pair value)
					);
				});
			}else{
				value.forEach((val, key) => {
					if(typeof key !== "string"){
						throw new SconUnserializableError(
							"anyMapKey option must be enabled for Maps with non-string keys"
						);
					}
					result.push(...this._encodeKeyValuePair(key, val));
				});
			}
		}else{
			for(const key in value){
				result.push(...this._encodeKeyValuePair(key, value[key]));
			}
		}
		result.push(Buffer.alloc(1)); // end of Map/array/whatever
		return result;
	}
	/**
	 * @private
	 * @param {string | null} key 
	 * @param {any} value 
	 * @param {boolean} isRefDef
	 */
	_encodeKeyValuePair(key, value){
		let valHeaderByte = 0;
		let extendedType = 0;
		/**@type {Buffer[]} */
		const bufs = [];
		if(typeof key === "string"){
			if(key.includes("\0")){
				throw new SconInvalidKeyError("Propery names cannot contain null bytes");
			}
			if(this.options.referencedStrings){
				valHeaderByte |= HEADER_BYTE.KEY_IS_REFERENCE;
				if(!this._stringRefNums.has(key)){
					// We can throw away the results here cuz we don't need the value header
					this._encodeKeyValuePair(null, key);
				}
				bufs.push(varIntToBuffer(this._stringRefNums.get(key)));
			}else{
				bufs.push(Buffer.from(key + "\0", "utf8"));
			}
		}
		switch(typeof value){
			case "bigint":
				valHeaderByte |= BASE_TYPES.INT_VAR;
				if(this.options.bigIntExtendedType != 0){
					valHeaderByte |= HEADER_BYTE.HAS_EXTENDED_TYPE;
					extendedType = this.options.bigIntExtendedType;
				}
				checkExtendedIntRange(value, this.options.bigIntExtendedType, SconSerializeError);
				if(value < 0n){
					valHeaderByte |= HEADER_BYTE.BASE_TYPE_VARIANT;
					value *= -1n;
				}
				bufs.push(varIntToBuffer(value));
				break;
			case "boolean":
				valHeaderByte |= BASE_TYPES.BOOLEAN;
				if(value){
					valHeaderByte |= HEADER_BYTE.BASE_TYPE_VARIANT;
				}
				break;
			case "function":
				throw new SconUnserializableError("Cannot encode function");
			case "number":
				if((value % 1) === 0 && value <= Number.MAX_SAFE_INTEGER){
					valHeaderByte |= BASE_TYPES.INT_VAR;
					if(this.options.intExtendedType != 0){
						valHeaderByte |= HEADER_BYTE.HAS_EXTENDED_TYPE;
						extendedType = this.options.intExtendedType;
					}
					checkExtendedIntRange(value, this.options.intExtendedType, SconSerializeError);
					if(value < 0){
						valHeaderByte |= HEADER_BYTE.BASE_TYPE_VARIANT;
						value *= -1;
					}
					bufs.push(varIntToBuffer(value));
				}else{
					if(this.options.smallerFloats && canUseFloat32(value)){
						const newBuf = Buffer.allocUnsafe(4);
						newBuf.writeFloatLE(value);
						bufs.push(newBuf);
					}else{
						valHeaderByte |= HEADER_BYTE.BASE_TYPE_VARIANT;
						const newBuf = Buffer.allocUnsafe(8);
						newBuf.writeDoubleLE(value);
						bufs.push(newBuf);
					}
				}
				break;
			case "object":
				if(value === null){
					valHeaderByte |= BASE_TYPES.NULL;
					break;
				}else if(Array.isArray(value) || value instanceof Set){
					valHeaderByte |= BASE_TYPES.OBJECT | HEADER_BYTE.BASE_TYPE_VARIANT;
					extendedType = value instanceof Set ? EXTENDED_TYPES.OBJECT.SET : 0;
					if(this.options.referencedObjects){
						if(value[OBJECT_REFERENCE_NUM] == null){
							const refBufs = this._createRefObjectBufs(valHeaderByte, extendedType, value);
							// Must be put into refBufs first to ensure any nested referenced values are defined first
							refBufs.push(...this._encodeArrayBody(value));
							this._referenceBufs.push(...refBufs);
						}
						// VALUE_IS_REFERENCE must be set *after* _createRefObjectBufs
						valHeaderByte |= HEADER_BYTE.VALUE_IS_REFERENCE;
						bufs.push(varIntToBuffer(value[OBJECT_REFERENCE_NUM]));
					}else{
						bufs.push(...this._encodeArrayBody(value));
					}
				}else if(value instanceof Buffer || value instanceof Uint8Array){
					if(value.length < 128 || value.includes(0)){
						bufs.push(
							varIntToBuffer(value.length),
							value
						);
					}else{
						bufs.push(
							value,
							Buffer.alloc(1)
						)
					}
				}else if(value instanceof Map){
					valHeaderByte |= BASE_TYPES.OBJECT | this.options.anyMapKey ? HEADER_BYTE.BASE_TYPE_VARIANT : 0;
					extendedType = EXTENDED_TYPES.OBJECT.ANY_KEY_MAP; // Same value as STRING_KEY_MAP
					if(this.options.referencedObjects){
						if(value[OBJECT_REFERENCE_NUM] == null){
							const refBufs = this._createRefObjectBufs(valHeaderByte, extendedType, value);
							// Must be put into refBufs first to ensure any nested referenced values are defined first
							refBufs.push(...this._encodeMapBody(value));
							this._referenceBufs.push(...refBufs);
						}
						// VALUE_IS_REFERENCE must be set *after* _createRefObjectBufs
						valHeaderByte |= HEADER_BYTE.VALUE_IS_REFERENCE;
						bufs.push(varIntToBuffer(value[OBJECT_REFERENCE_NUM]));
					}else{
						bufs.push(...this._encodeMapBody(value));
					}
				}else if(
					!this.options.throwOnUnknownObject ||
					Object.getPrototypeOf(value) == Object.prototype ||
					Object.getPrototypeOf(value) == null
				){
					valHeaderByte |= BASE_TYPES.OBJECT;
					if(this.options.referencedObjects){
						if(value[OBJECT_REFERENCE_NUM] == null){
							const refBufs = this._createRefObjectBufs(valHeaderByte, extendedType, value);
							// Must be put into refBufs first to ensure any nested referenced values are defined first
							refBufs.push(...this._encodeMapBody(value));
							this._referenceBufs.push(...refBufs);
						}
						// VALUE_IS_REFERENCE must be set *after* _createRefObjectBufs
						valHeaderByte |= HEADER_BYTE.VALUE_IS_REFERENCE;
						bufs.push(varIntToBuffer(value[OBJECT_REFERENCE_NUM]));
					}else{
						bufs.push(...this._encodeMapBody(value));
					}
				}else{
					throw new SconUnserializableError(
						"Unknown object type: " + Object.getPrototypeOf(value).constructor.name
					);
				}
			case "string":{
				// String#includes is actually faster than Uint8Array#includes... Go figure
				const hasNull = value.includes("\0");
				valHeaderByte |= HEADER_BYTE.BASE_TYPE_VARIANT | (
					hasNull ? BASE_TYPES.STRING_LENGTH_PREFIXED : BASE_TYPES.STRING_ZERO_TERM
				);
				if(this.options.referencedStrings){
					valHeaderByte |= HEADER_BYTE.VALUE_IS_REFERENCE;
					if(!this._stringRefNums.has(value)){
						this._referenceBufs.push(Buffer.alloc(
							1, 
							(hasNull ? BASE_TYPES.STRING_LENGTH_PREFIXED : BASE_TYPES.STRING_ZERO_TERM) |
							HEADER_BYTE.BASE_TYPE_VARIANT |
							HEADER_BYTE.IS_REFERENCE_DEFINITION |
							(this.options.explicitReferenceDefinition ? HEADER_BYTE.KEY_IS_REFERENCE_SLOT : 0)
						));
						const stringRef = this._curRefNum ++;
						if(this.options.explicitReferenceDefinition){
							this._referenceBufs.push(varIntToBuffer(stringRef));
						}
						if(hasNull){
							this._referenceBufs.push(varIntToBuffer(value.length), Buffer.from(value, "utf8"));
						}else{
							this._referenceBufs.push(Buffer.from(value, "utf8"), Buffer.alloc(1));
						}
						this._stringRefNums.set(value, stringRef);
					}
					bufs.push(varIntToBuffer(this._stringRefNums.get(value)));
				}else if(hasNull){
					bufs.push(varIntToBuffer(value.length), Buffer.from(value, "utf8"));
				}else{
					bufs.push(Buffer.from(value, "utf8"), Buffer.alloc(1));
				}
				break;
			}
			case "symbol":
				throw new SconUnserializableError("Cannot encode symbol");
			case "undefined":
				// Falls through
			default:
				// Ignore
		}
		if(extendedType){
			valHeaderByte |= HEADER_BYTE.HAS_EXTENDED_TYPE;
			bufs.unshift(Buffer.alloc(1, extendedType));
		}
		bufs.unshift(Buffer.alloc(1, valHeaderByte));
		return bufs;
	}
	_clearReferences(){
		if(!this.options.keepReferenceValues){
			for(let i = 0; i < this._seenObjects.length; i += 1){
				delete this._seenObjects[i][OBJECT_REFERENCE_NUM];
			}
			this._seenObjects.length = 0;
			this._stringRefNums.clear();
			this._curRefNum = 0;
		}
	}
	/**
	 * @template T
	 * @param {T} value
	 * @returns {import("./shared").SconEncodedBufferOf<T>}
	 */
	encode(value){
		this._clearReferences();
		if(this.options.magicNumber){
			this._referenceBufs.push(MAGIC_NUMBER);
		}
		for(const k in value){
			this._encodedBufs.push(...this._encodeKeyValuePair(k, value[k]));
		}
		// Doing it this way is much faster than Array#reduce
		let totalLength = 1;
		for(let i = 0; i < this._referenceBufs.length; i += 1){
			totalLength += this._referenceBufs[i].length;
		}
		for(let i = 0; i < this._encodedBufs.length; i += 1){
			totalLength += this._encodedBufs[i].length;
		}
		const result = Buffer.allocUnsafe(totalLength);
		let curLength = 0;
		for(let i = 0; i < this._referenceBufs.length; i += 1){
			const refBuf = this._referenceBufs[i];
			refBuf.copy(result, curLength);
			curLength += refBuf.length;
		}
		this._referenceBufs.length = 0;
		for(let i = 0; i < this._encodedBufs.length; i += 1){
			const encBuf = this._encodedBufs[i];
			encBuf.copy(result, curLength);
			curLength += encBuf.length;
		}
		result[curLength] = 0; // End of object
		this._encodedBufs.length = 0;
		this._clearReferences();
		return result;
	}
}
module.exports = {SconEncoder};
