const {MAGIC_NUMBER, HEADER_BYTE, BASE_TYPES, EXTENDED_TYPES} = require("./conf");
const {SconUnserializableError, SconSerializeError, SconInvalidKeyError} = require("./error");
const {checkExtendedIntRange} = require("./shared");
const {canUseFloat32, varIntLen, varIntToBuffer, DEFAULT_OPTIONS} = require("./encode-common");
const BUFFER_SLICE_LENGTH = 64 * 1024;
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
	_newSlice(){
		this._slices.push(this._curSlice);
		this._curSlice = {
			buf: Buffer.allocUnsafe(BUFFER_SLICE_LENGTH),
			len: 0
		};
	}
	/**
	 * @private
	 * @param {Buffer} value 
	 */
	_writeBufferValue(value){
		if(value.length >= BUFFER_SLICE_LENGTH){
			this._newSlice();
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
	 */
	_writeUtf8Value(value){
		const byteLen = Buffer.byteLength(value);
		if(byteLen >= BUFFER_SLICE_LENGTH){
			this._newSlice();
			this._slices.push({
				buf: Buffer.from(value, "utf8"),
				len: byteLen
			});
		}else if(byteLen > (this._curSlice.buf.length - this._curSlice.len)){
			this._newSlice();
		}
		this._curSlice.buf.write(value, "utf8");
		this._curSlice.len += byteLen;
		this._totalLength += byteLen;
	}
	/**
	 * @private
	 * @param {number} value 
	 */
	_writeByte(value){
		if(this._curSlice.len === this._curSlice.buf.length){
			this._newSlice();
		}
		this._curSlice.buf[this._curSlice.len++] = value;
		this._totalLength ++;
	}
	/**
	 * @private
	 * @param {number | BigInt} value 
	 */
	_writeVarInt(value){
		const byteLen = varIntLen(value);
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

	_actuallyEncode(value){
		
	}
	encode(value){
		if(
			this.options.referencedObjects ||
			this.options.referencedStrings
		){
			throw new SconUnserializableError("FastSconEncoder cannot encode refrences");
		}
		if(this.options.magicNumber){
			this._writeBufferValue(MAGIC_NUMBER);
		}
		this._actuallyEncode(value);
	}
}