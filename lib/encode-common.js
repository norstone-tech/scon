const {EXTENDED_TYPES} = require("./conf");
/**
 * @typedef SconEncodeOptions
 * @property {boolean} [magicNumber=true] Prepend the output with the SCON3 identifier
 * @property {boolean} [referencedObjects=false] If true, all object values will be referenced. Slightly increases
 * output size and encode time. You should really only use this if you intend to encode circular objects
 * @property {boolean} [referencedStrings=false] If true, all strings will be referenced. Slightly increases encoding
 * time, but decreases output size if a lot of the same string values or property names are used multiple times.
 * @property {boolean} [throwOnUnknownObject=false] If true, this will throw if an object's type is unknown or isn't a
 * "pure" object. If false, any "unknown" object will be encoded as a regular object using said objects enumerable
 * properties
 * @property {boolean} [keepReferenceValues=false] If true, the internal table of referenced values will not be cleared
 * When encoding multiple objects. You may use this if you intend to split your values across multiple outputs
 * @property {boolean} [explicitReferenceDefinition=false] You should always set this to `true` after setting
 * `keepReferenceValues` to false if it was previously `true`
 * @property {boolean} [anyMapKey=false] Allows for the keys of a `Map` object to be non-strings. Increases output size
 * @property {boolean} [encodeIntsAsFloats=false] Encode integer number values as 64-bit floats instead of
 * variable-sized ints. Increases output size, but decreases encoding/decoding time by a sh*t-ton
 * @property {boolean} [smallerFloats=true] Encode floats using 32-bits instead of 64-bits if it can be done without
 * losing accuracy
 * @property {number} [intExtendedType=0]
 * How integers should be encoded
 * @property {number} [bigIntExtendedType=16]
 * How BigInts should be encoded
 */
/** @type {SconEncodeOptions} */
const DEFAULT_OPTIONS = {
	magicNumber: true,
	referencedObjects: false,
	referencedStrings: false,
	throwOnUnknownObject: false,
	keepReferenceValues: false,
	explicitReferenceDefinition: false,
	anyMapKey: false,
	encodeIntsAsFloats: false,
	smallerFloats: true,
	intExtendedType: EXTENDED_TYPES.INT_VAR.FLOAT_64_SAFE_INT,
	bigIntExtendedType: EXTENDED_TYPES.INT_VAR.INF_INT
};
const singleFloatChecker = new Float32Array(1);
const canUseFloat32 = function(/** @type {number} */ num){
	/* istanbul ignore next */
	if(isNaN(num)){
		// Can't test for this right now, NaNs can be stored in multiple ways
		return true;
	}
	singleFloatChecker[0] = num;
	return num === singleFloatChecker[0];
};
const MAX_SAFE_BITSHIFT_VALUE = 2 ** 31 - 1;
const numOfBits = (/** @type {number | BigInt}*/ num) => {
	if(typeof num === "bigint"){
		// Feedback is appreciated for this. Unironically the most performant way I found
		return num.toString(2).length;
	}
	return num == 0 ? 1 : Math.floor(Math.log2(num)) + 1;
};
const varIntLen = (/** @type {number | BigInt}*/ num) => Math.ceil(Math.ceil(numOfBits(num) * 8 / 7) / 8);
const varIntToBuffer = function(
	/** @type {number | BigInt}*/ val,
	bytesToWrite = varIntLen(val),
	buf = Buffer.allocUnsafe(bytesToWrite),
	startOffset = 0
){
	if(typeof val === "bigint"){
		for(let i = startOffset + bytesToWrite - 1; i >= startOffset; i -= 1){
			buf[i] = Number(val & 0b01111111n) | 0b10000000;
			val >>= 7n;
		}
		// The last byte actually needs its highest bit 0 to signify end-of-varint
		buf[startOffset + bytesToWrite - 1] &= 0b01111111;
	}else{
		for(let i = startOffset + bytesToWrite - 1; i >= startOffset; i -= 1){
			buf[i] = val & 0b01111111 | 0b10000000;
			if(val > MAX_SAFE_BITSHIFT_VALUE){
				val = Math.floor(val / 128);
			}else{
				val >>= 7;
			}
		}
		// The last byte actually needs its highest bit 0 to signify end-of-varint
		buf[startOffset + bytesToWrite - 1] &= 0b01111111;
	}
	return buf;
};
module.exports = {canUseFloat32, numOfBits, varIntLen, varIntToBuffer, DEFAULT_OPTIONS};
