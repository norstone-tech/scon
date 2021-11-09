/**
 * @template T
 * @typedef {Buffer} SconEncodedBufferOf<T>
 */
const {EXTENDED_TYPES, VARINT_RAGES} = require("./conf");
const checkExtendedIntRange = function(
	/** @type {BigInt | number}*/ num,
	/** @type {number} */ extendedType,
	/** @type {NewableFunction} */ ErrorToThrow
){
	switch(extendedType){
		case EXTENDED_TYPES.INT_VAR.FLOAT_64_SAFE_INT:
			if(
				num > VARINT_RAGES.FLOAT_64_SAFE_INT.MAX_VALUE ||
				num < VARINT_RAGES.FLOAT_64_SAFE_INT.MIN_VALUE
			){
				throw new ErrorToThrow("Integer is out or range (expected a JS-safe int)");
			}
			break;
		case EXTENDED_TYPES.INT_VAR.UINT8:
			if(
				num > VARINT_RAGES.UINT8.MAX_VALUE ||
				num < VARINT_RAGES.UINT8.MIN_VALUE
			){
				throw new ErrorToThrow("Integer is out or range (expected a uint8)");
			}
			break;
		case EXTENDED_TYPES.INT_VAR.SINT8:
			if(
				num > VARINT_RAGES.SINT8.MAX_VALUE ||
				num < VARINT_RAGES.SINT8.MIN_VALUE
			){
				throw new ErrorToThrow("Integer is out or range (expected a sint8)");
			}
			break;
		case EXTENDED_TYPES.INT_VAR.UINT16:
			if(
				num > VARINT_RAGES.UINT16.MAX_VALUE ||
				num < VARINT_RAGES.UINT16.MIN_VALUE
			){
				throw new ErrorToThrow("Integer is out or range (expected a uint16)");
			}
			break;
		case EXTENDED_TYPES.INT_VAR.SINT16:
			if(
				num > VARINT_RAGES.SINT16.MAX_VALUE ||
				num < VARINT_RAGES.SINT16.MIN_VALUE
			){
				throw new ErrorToThrow("Integer is out or range (expected a sint16)");
			}
			break;
		case EXTENDED_TYPES.INT_VAR.UINT32:
			if(
				num > VARINT_RAGES.UINT32.MAX_VALUE ||
				num < VARINT_RAGES.UINT32.MIN_VALUE
			){
				throw new ErrorToThrow("Integer is out or range (expected a uint32)");
			}
			break;
		case EXTENDED_TYPES.INT_VAR.SINT32:
			if(
				num > VARINT_RAGES.SINT32.MAX_VALUE ||
				num < VARINT_RAGES.SINT32.MIN_VALUE
			){
				throw new ErrorToThrow("Integer is out or range (expected a sint32)");
			}
			break;
		case EXTENDED_TYPES.INT_VAR.UINT64:
			if(
				num > VARINT_RAGES.UINT64.MAX_VALUE ||
				num < VARINT_RAGES.UINT64.MIN_VALUE
			){
				throw new ErrorToThrow("Integer is out or range (expected a uint64)");
			}
			break;
		case EXTENDED_TYPES.INT_VAR.SINT64:
			if(
				num > VARINT_RAGES.SINT64.MAX_VALUE ||
				num < VARINT_RAGES.SINT64.MIN_VALUE
			){
				throw new ErrorToThrow("Integer is out or range (expected a sint64)");
			}
			break;
		case EXTENDED_TYPES.INT_VAR.UINT128:
			if(
				num > VARINT_RAGES.UINT128.MAX_VALUE ||
				num < VARINT_RAGES.UINT128.MIN_VALUE
			){
				throw new ErrorToThrow("Integer is out or range (expected a uint128)");
			}
			break;
		case EXTENDED_TYPES.INT_VAR.SINT128:
			if(
				num > VARINT_RAGES.SINT128.MAX_VALUE ||
				num < VARINT_RAGES.SINT128.MIN_VALUE
			){
				throw new ErrorToThrow("Integer is out or range (expected a sint128)");
			}
			break;
		case EXTENDED_TYPES.INT_VAR.UINT256:
			if(
				num > VARINT_RAGES.UINT256.MAX_VALUE ||
				num < VARINT_RAGES.UINT256.MIN_VALUE
			){
				throw new ErrorToThrow("Integer is out or range (expected a uint256)");
			}
			break;
		case EXTENDED_TYPES.INT_VAR.SINT256:
			if(
				num > VARINT_RAGES.SINT256.MAX_VALUE ||
				num < VARINT_RAGES.SINT256.MIN_VALUE
			){
				throw new ErrorToThrow("Integer is out or range (expected a sint256)");
			}
			break;
		default:
			// Nothing to check
	}
};
module.exports = {checkExtendedIntRange};
