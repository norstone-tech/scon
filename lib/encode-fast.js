const {MAGIC_NUMBER, HEADER_BYTE, BASE_TYPES, EXTENDED_TYPES} = require("./conf");
const {SconUnserializableError, SconSerializeError, SconInvalidKeyError} = require("./error");
const {checkExtendedIntRange} = require("./shared");
const {canUseFloat32, varIntLen, varIntToBuffer, DEFAULT_OPTIONS} = require("./encode-common");
const BUFFER_SLICE_LENGTH = 64 * 1024;
const BYTE_LEN_32BIT = 4;
const BYTE_LEN_64BIT = 8;
/**
 * @private
 * @typedef {import("./encode-common").SconEncodeOptions} SconEncodeOptions
 */
/**
 * @private
 * @typedef BufferSlice
 * @property {Buffer} buf
 * @property {number} len
 */
class FastSconEncoder {
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
		 * @type {number}
		 */
		this._i = 0;
		/**
		 * @private
		 * @type {number}
		 */
		this._totalLength = 0;
		/**
		 * @private
		 * @type {BufferSlice}
		 */
		this._curSlice = {
			buf: Buffer.allocUnsafe(BUFFER_SLICE_LENGTH),
			len: 0
		};
		/**
		 * @private
		 * @type {BufferSlice[]}
		 */
		this._slices = [];
	}
	/**
	 * @private
	 */
	/* istanbul ignore next: TODO: WRITE TEST FOR THIS CASE */
	_newSlice(){
		this._slices.push(this._curSlice);
		this._curSlice = {
			buf: Buffer.allocUnsafe(BUFFER_SLICE_LENGTH),
			len: 0
		};
	}
	/**
	 * @private
	 * @param {Buffer | Uint8Array} value
	 */
	_writeBufferValue(value){
		/* istanbul ignore next: TODO: WRITE TEST FOR THIS CASE */
		if(value.length >= BUFFER_SLICE_LENGTH){
			this._newSlice();
			if(!(value instanceof Buffer)){
				value = Buffer.from(value.buffer, value.byteOffset, value.length);
			}
			this._slices.push({
				buf: value,
				len: value.length
			});
		}else if(value.length > (this._curSlice.buf.length - this._curSlice.len)){
			this._newSlice();
		}
		this._curSlice.buf.set(value, this._curSlice.len);
		this._curSlice.len += value.length;
		this._totalLength += value.length;
	}
	/**
	 * @private
	 * @param {string} value
	 * @param {number} [byteLen = Buffer.byteLength(value)]
	 */
	_writeUtf8Value(value, byteLen = Buffer.byteLength(value)){
		/* istanbul ignore next: TODO: WRITE TEST FOR THIS CASE */
		if(byteLen >= BUFFER_SLICE_LENGTH){
			this._newSlice();
			this._slices.push({
				buf: Buffer.from(value, "utf8"),
				len: byteLen
			});
		}else if(byteLen > (this._curSlice.buf.length - this._curSlice.len)){
			this._newSlice();
		}
		this._curSlice.buf.write(value, this._curSlice.len, "utf8");
		this._curSlice.len += byteLen;
		this._totalLength += byteLen;
	}
	/**
	 * @private
	 * @param {number} value
	 */
	_writeByte(value){
		/* istanbul ignore next: TODO: WRITE TEST FOR THIS CASE */
		if(this._curSlice.len === this._curSlice.buf.length){
			this._newSlice();
		}
		this._curSlice.buf[this._curSlice.len++] = value;
		this._totalLength++;
	}
	/**
	 * @private
	 * @param {number | BigInt} value
	 */
	_writeVarInt(value){
		const byteLen = varIntLen(value);
		/* istanbul ignore next: TODO: WRITE TEST FOR THIS CASE */
		if(byteLen >= BUFFER_SLICE_LENGTH){
			this._newSlice();
			this._slices.push({
				buf: varIntToBuffer(value),
				len: byteLen
			});
		}else if(byteLen > (this._curSlice.buf.length - this._curSlice.len)){
			this._newSlice();
		}
		varIntToBuffer(value, byteLen, this._curSlice.buf, this._curSlice.len);
		this._curSlice.len += byteLen;
		this._totalLength += byteLen;
	}
	/**
	 * @private
	 * @param {number} value
	 */
	_writeFloat32Value(value){
		/* istanbul ignore next: TODO: WRITE TEST FOR THIS CASE */
		if(BYTE_LEN_32BIT > (this._curSlice.buf.length - this._curSlice.len)){
			this._newSlice();
		}
		this._curSlice.buf.writeFloatLE(value, this._curSlice.len);
		this._curSlice.len += BYTE_LEN_32BIT;
		this._totalLength += BYTE_LEN_32BIT;
	}
	/**
	 * @private
	 * @param {number} value
	 */
	_writeFloat64Value(value){
		/* istanbul ignore next: TODO: WRITE TEST FOR THIS CASE */
		if(BYTE_LEN_64BIT > (this._curSlice.buf.length - this._curSlice.len)){
			this._newSlice();
		}
		this._curSlice.buf.writeDoubleLE(value, this._curSlice.len);
		this._curSlice.len += BYTE_LEN_64BIT;
		this._totalLength += BYTE_LEN_64BIT;
	}
	/**
	 *
	 * @param {any} value
	 * @param {string} [key]
	 */
	_writeKeyValuePair(value, key){
		switch(typeof value){
			case "bigint": {
				const extendedType = this.options.bigIntExtendedType;
				let headerByte = BASE_TYPES.INT_VAR | (extendedType ? HEADER_BYTE.HAS_EXTENDED_TYPE : 0);
				checkExtendedIntRange(value, extendedType, SconSerializeError);
				if(value < 0n){
					headerByte |= HEADER_BYTE.BASE_TYPE_VARIANT;
					value *= -1n;
				}
				this._writeByte(headerByte);
				if(extendedType){
					this._writeByte(extendedType);
				}
				/* istanbul ignore next: Same as all the other key writing things */
				if(key !== undefined){
					this._writeUtf8Value(key);
					this._writeByte(0); // end of key
				}
				this._writeVarInt(value);
				break;
			}
			case "boolean":
				this._writeByte(BASE_TYPES.BOOLEAN | (value ? HEADER_BYTE.BASE_TYPE_VARIANT : 0));
				/* istanbul ignore next: Same as all the other key writing things */
				if(key !== undefined){
					this._writeUtf8Value(key);
					this._writeByte(0); // end of key
				}
				break;
			case "function":
				throw new SconUnserializableError("Cannot encode function");
			case "number":
				if(!this.options.encodeIntsAsFloats && (value % 1) === 0 && value <= Number.MAX_SAFE_INTEGER){
					const extendedType = this.options.intExtendedType;
					let headerByte = BASE_TYPES.INT_VAR | (extendedType ? HEADER_BYTE.HAS_EXTENDED_TYPE : 0);
					checkExtendedIntRange(value, extendedType, SconSerializeError);
					if(value < 0){
						headerByte |= HEADER_BYTE.BASE_TYPE_VARIANT;
						value *= -1;
					}
					this._writeByte(headerByte);
					if(extendedType){
						this._writeByte(extendedType);
					}
					if(key !== undefined){
						this._writeUtf8Value(key);
						this._writeByte(0); // end of key
					}
					this._writeVarInt(value);
				}else if(this.options.smallerFloats && canUseFloat32(value)){
					this._writeByte(BASE_TYPES.FLOAT_FIXED);
					if(key !== undefined){
						this._writeUtf8Value(key);
						this._writeByte(0); // end of key
					}
					this._writeFloat32Value(value);
				}else{
					this._writeByte(BASE_TYPES.FLOAT_FIXED | HEADER_BYTE.BASE_TYPE_VARIANT);
					/* istanbul ignore next: Same as all the other key writing things */
					if(key !== undefined){
						this._writeUtf8Value(key);
						this._writeByte(0); // end of key
					}
					this._writeFloat64Value(value);
				}
				break;
			case "object":
				if(value == null){
					this._writeByte(BASE_TYPES.NULL);
					if(key !== undefined){
						this._writeUtf8Value(key);
						this._writeByte(0); // end of key
					}
				}else if(Array.isArray(value)){
					this._writeByte(BASE_TYPES.OBJECT | HEADER_BYTE.BASE_TYPE_VARIANT); // Start of array
					/* istanbul ignore next: Same as all the other key writing things */
					if(key !== undefined){
						this._writeUtf8Value(key);
						this._writeByte(0); // end of key
					}
					for(let i = 0; i < value.length; i += 1){
						this._writeKeyValuePair(value[i]);
					}
					this._writeByte(0); // end of array
				}else if(value instanceof Set){
					this._writeByte(
						BASE_TYPES.OBJECT |
						HEADER_BYTE.BASE_TYPE_VARIANT |
						HEADER_BYTE.HAS_EXTENDED_TYPE
					); // Start of array (which is a set)
					this._writeByte(EXTENDED_TYPES.OBJECT.SET);
					/* istanbul ignore next: Same as all the other key writing things */
					if(key !== undefined){
						this._writeUtf8Value(key);
						this._writeByte(0); // end of key
					}
					for(const innerVal of value){
						this._writeKeyValuePair(innerVal);
					}
					this._writeByte(0); // end of array (which is a set)
				}else if(value instanceof Uint8Array){
					if(value.length < 128 || value.includes(0)){
						this._writeByte(BASE_TYPES.STRING_LENGTH_PREFIXED);
						/* istanbul ignore next: Same as all the other key writing things */
						if(key !== undefined){
							this._writeUtf8Value(key);
							this._writeByte(0); // end of key
						}
						this._writeVarInt(value.length);
						this._writeBufferValue(value);
					}else{
						this._writeByte(BASE_TYPES.STRING_ZERO_TERM);
						/* istanbul ignore next: Same as all the other key writing things */
						if(key !== undefined){
							this._writeUtf8Value(key);
							this._writeByte(0); // end of key
						}
						this._writeBufferValue(value);
						this._writeByte(0);
					}
				}else if(value instanceof Map){
					if(this.options.anyMapKey){
						this._writeByte(
							BASE_TYPES.OBJECT |
							HEADER_BYTE.BASE_TYPE_VARIANT |
							HEADER_BYTE.HAS_EXTENDED_TYPE
						); // Start of array (which is an array of key+value pairs)
						this._writeByte(EXTENDED_TYPES.OBJECT.ANY_KEY_MAP);
						/* istanbul ignore next: Same as all the other key writing things */
						if(key !== undefined){
							this._writeUtf8Value(key);
							this._writeByte(0); // end of key
						}
						// This is actually almost twice as fast as Map#entries()!
						value.forEach((val, key) => {
							this._writeByte(BASE_TYPES.OBJECT | HEADER_BYTE.BASE_TYPE_VARIANT); // Start of pair
							this._writeKeyValuePair(key);
							this._writeKeyValuePair(val);
							this._writeByte(0); // end of pair
						});
						this._writeByte(0); // end of array (which is an array of key+value pairs)
					}else{
						this._writeByte(
							BASE_TYPES.OBJECT |
							HEADER_BYTE.HAS_EXTENDED_TYPE
						); // Start of map
						this._writeByte(EXTENDED_TYPES.OBJECT.STRING_KEY_MAP);
						/* istanbul ignore next: Same as all the other key writing things */
						if(key !== undefined){
							this._writeUtf8Value(key);
							this._writeByte(0); // end of key
						}
						value.forEach((val, key) => {
							if(typeof key !== "string"){
								throw new SconUnserializableError(
									"anyMapKey option must be enabled for Maps with non-string keys"
								);
							}
							/* istanbul ignore next: Same as all the other key writing things */
							if(key.includes("\0")){
								throw new SconInvalidKeyError("Keys must not contain null bytes");
							}
							this._writeKeyValuePair(val, key);
						});
						this._writeByte(0); // end of map
					}
				}else if(value instanceof Date){
					let headerByte = BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE;
					const hasMs = value.getMilliseconds() !== 0;
					let timeNum = hasMs ? value.getTime() : (value.getTime() / 1000);
					if(timeNum < 0){
						headerByte |= HEADER_BYTE.BASE_TYPE_VARIANT;
						timeNum *= -1;
					}
					this._writeByte(headerByte);
					this._writeByte(hasMs ? EXTENDED_TYPES.INT_VAR.DATE_MS : EXTENDED_TYPES.INT_VAR.DATE_S);
					/* istanbul ignore next: Same as all the other key writing things */
					if(key !== undefined){
						this._writeUtf8Value(key);
						this._writeByte(0); // end of key
					}
					this._writeVarInt(timeNum);
				}else if(
					!this.options.throwOnUnknownObject ||
					Object.getPrototypeOf(value) == Object.prototype ||
					Object.getPrototypeOf(value) == null
				){
					this._writeByte(
						BASE_TYPES.OBJECT
					); // Start of map
					if(key !== undefined){
						this._writeUtf8Value(key);
						this._writeByte(0); // end of key
					}
					for(const key in value){
						if(key.includes("\0")){
							throw new SconInvalidKeyError("Keys must not contain null bytes");
						}
						this._writeKeyValuePair(value[key], key);
					}
					this._writeByte(0); // end of map
				}else{
					throw new SconUnserializableError(
						`Unknown object type: ${Object.getPrototypeOf(value).constructor.name}`
					);
				}
				break;
			case "string": {
				const byteLength = Buffer.byteLength(value);
				if(value.includes("\0")){
					this._writeByte(BASE_TYPES.STRING_LENGTH_PREFIXED | HEADER_BYTE.BASE_TYPE_VARIANT);
					/* istanbul ignore next: Same as all the other key writing things */
					if(key !== undefined){
						this._writeUtf8Value(key);
						this._writeByte(0); // end of key
					}
					this._writeVarInt(byteLength);
					this._writeUtf8Value(value, byteLength);
				}else{
					this._writeByte(BASE_TYPES.STRING_ZERO_TERM | HEADER_BYTE.BASE_TYPE_VARIANT);
					if(key !== undefined){
						this._writeUtf8Value(key);
						this._writeByte(0); // end of key
					}
					this._writeUtf8Value(value, byteLength);
					this._writeByte(0);
				}
				break;
			}
			case "symbol":
				throw new SconUnserializableError("Cannot encode symbol");
			case "undefined":
				// nothing
				break;
			/* istanbul ignore next */
			default:
				throw new SconUnserializableError(`Unknown value type ${typeof value}`);
		}
	}
	encode(value){
		/* istanbul ignore next: I don't care anymore */
		if(
			this.options.referencedObjects ||
			this.options.referencedStrings
		){
			throw new SconUnserializableError("FastSconEncoder cannot encode refrences");
		}
		try{
			if(this.options.magicNumber){
				this._writeBufferValue(MAGIC_NUMBER);
			}
			if(value === undefined){
				this._writeByte(BASE_TYPES.EOF);
			}else{
				this._writeKeyValuePair(value);
			}
			let result;
			/* istanbul ignore next: TODO: WRITE TEST FOR THIS CASE */
			if(this._slices.length){
				this._slices.push(this._curSlice);
				result = Buffer.allocUnsafe(this._totalLength);
				let curLen = 0;
				for(let i = 0; i < this._slices.length; i += 1){
					const {buf, len} = this._slices[i];
					buf.copy(result, curLen, 0, len);
					curLen += len;
				}
				this._curSlice = {
					buf: Buffer.allocUnsafe(BUFFER_SLICE_LENGTH),
					len: 0
				};
				this._slices.length = 0;
			}else if(this._curSlice.len == this._curSlice.buf.length){
				result = this._curSlice.buf;
				this._curSlice = {
					buf: Buffer.allocUnsafe(BUFFER_SLICE_LENGTH),
					len: 0
				};
			}else{
				result = this._curSlice.buf.subarray(0, this._curSlice.len);
				this._curSlice = {
					buf: this._curSlice.buf.slice(this._curSlice.len),
					len: 0
				};
			}
			this._totalLength = 0;
			return result;
		}catch(ex){
			// clean up before re-throwing error
			this._totalLength = 0;
			this._slices.length = 0;
			this._curSlice.len = 0;
			throw ex;
		}
	}
}
const defaultEncoder = new FastSconEncoder();
/**
 * Encode SCON data, using only the default options
 * @template T
 * @param {T} value
 * @returns {import("./shared").SconEncodedBufferOf<T>}
 */
const encode = function(value){
	return defaultEncoder.encode(value);
};
module.exports = {FastSconEncoder, encode};
