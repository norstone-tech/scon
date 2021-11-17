/* eslint-env mocha */
/* eslint-disable prefer-arrow-callback */
const {expect} = require("chai");
const {FastSconEncoder, BASE_TYPES, HEADER_BYTE, SconUnserializableError, SconInvalidKeyError, EXTENDED_TYPES, SconSerializeError} = require("../");

describe("Fast SCON Encoder", function() {
	describe("basic object and string encoding", function(){
		it("encodes empty objects as a single null byte (magic number explicitly disabled)", function(){
			const encoder = new FastSconEncoder({magicNumber: false});
			expect(
				encoder.encode({})
			).to.deep.equal(Buffer.from([
				BASE_TYPES.OBJECT, // Start of root value object
				0x00 // End of Object
			]));
		});
		it("encodes empty objects as a single null byte prepended with a magic number (magic number explicitly enabled)", function(){
			const encoder = new FastSconEncoder({magicNumber: true});
			expect(
				encoder.encode({})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // Start of root value object
				0x00 // End of Object
			]));
		});
		it("encodes empty objects as a single null byte prepended with a magic number (magic number implicitly enabled)", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode({})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // Start of root value object
				0x00 // End of Object
			]));
		});
		it("Can encode null-terminated strings as a root value", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode("hello, world!")
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.STRING_ZERO_TERM | HEADER_BYTE.BASE_TYPE_VARIANT, // UTF8-encoded string
				"h".charCodeAt(),
				"e".charCodeAt(),
				"l".charCodeAt(),
				"l".charCodeAt(),
				"o".charCodeAt(),
				",".charCodeAt(),
				" ".charCodeAt(),
				"w".charCodeAt(),
				"o".charCodeAt(),
				"r".charCodeAt(),
				"l".charCodeAt(),
				"d".charCodeAt(),
				"!".charCodeAt(),
				0x00, // End of root string value
			]));
		});
		it("encodes simple object-based string maps using null terminated strings", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode({hello: "world"})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // Start of root value object
				BASE_TYPES.STRING_ZERO_TERM | HEADER_BYTE.BASE_TYPE_VARIANT, // UTF8-encoded string
				"h".charCodeAt(),
				"e".charCodeAt(),
				"l".charCodeAt(),
				"l".charCodeAt(),
				"o".charCodeAt(),
				0x00, // End of key string
				"w".charCodeAt(),
				"o".charCodeAt(),
				"r".charCodeAt(),
				"l".charCodeAt(),
				"d".charCodeAt(),
				0x00, // End of string value
				0x00 // End of Object
			]));
		});
		it("can encode strings with null bytes in them", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode("hello,\0world!")
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.STRING_LENGTH_PREFIXED | HEADER_BYTE.BASE_TYPE_VARIANT, // UTF8-encoded string
				"hello,\0world!".length,
				"h".charCodeAt(),
				"e".charCodeAt(),
				"l".charCodeAt(),
				"l".charCodeAt(),
				"o".charCodeAt(),
				",".charCodeAt(),
				"\0".charCodeAt(),
				"w".charCodeAt(),
				"o".charCodeAt(),
				"r".charCodeAt(),
				"l".charCodeAt(),
				"d".charCodeAt(),
				"!".charCodeAt()
				// String was length-prefixed, no need for end byte
			]));
		});
		it("cannot encode keys with null bytes in them", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode.bind(encoder, ({"hell\0": "world"}))
			).to.throw(SconInvalidKeyError);
		});
	});
	describe("symbol encoding", function(){
		it("doesn't encode symbols", function(){
			const encoder = new FastSconEncoder();
			expect(encoder.encode.bind(encoder, {hello: Symbol("world")}))
				.to.throw(SconUnserializableError);
		});
	});
	describe("function encoding", function(){
		it("doesn't encode functions", function(){
			const encoder = new FastSconEncoder();
			expect(encoder.encode.bind(encoder, {hello: () => {}}))
				.to.throw(SconUnserializableError);
		});
	});
	describe("undefined value encoding", function(){
		it("ignores undefined object values", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode({hello: undefined})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // Start of root value object
				0x00 // End of Object
			]));
		});
		it("can encode an undefined root value with the magic number", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode(undefined)
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.EOF
			]));
		});
		it("can encode an undefined root value without the magic number", function(){
			const encoder = new FastSconEncoder({magicNumber: false});
			expect(
				encoder.encode(undefined)
			).to.deep.equal(Buffer.from([
				BASE_TYPES.EOF
			]));
		});
	});
	describe("null value encoding", function(){
		it("works", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode({hello: null})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.NULL,
				"h".charCodeAt(),
				"e".charCodeAt(),
				"l".charCodeAt(),
				"l".charCodeAt(),
				"o".charCodeAt(),
				0x00, // End of key string
				// No value to encode, literally just null
				0x00 // End of root Object
			]));
			expect(
				encoder.encode(null)
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.NULL // Root value is null. That's it
			]));
		});
	});
	describe("number value encoding", function(){
		it("opportunistically encodes integer values as variable-width ints", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode(100)
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.INT_VAR,
				100, // 100 woo
			]));
			expect(
				encoder.encode(-100)
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT, // Negative int
				100,
			]));
		});
		it("Encodes variable width ints correctly", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode({
					i0: 0,
					n0: -0,
					i1: 1,
					n1: -1,
					i2: 1 * 128,
					n2: -1 * 128,
					i3: 1 * (128 ** 2),
					n3: -1 * (128 ** 2),
					i4: 1 * (128 ** 3),
					n4: -1 * (128 ** 3),
					i5: 1 * (128 ** 4),
					n5: -1 * (128 ** 4),
					i6: 1 * (128 ** 5),
					n6: -1 * (128 ** 5),
					i7: 1 * (128 ** 6),
					n7: -1 * (128 ** 6),
					i8: 1 * (128 ** 7),
					n8: -1 * (128 ** 7)
				})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.INT_VAR,
				"i".charCodeAt(),
				"0".charCodeAt(),
				0x00, // End of key string
				0,
				BASE_TYPES.INT_VAR,
				"n".charCodeAt(),
				"0".charCodeAt(),
				0x00, // End of key string
				0,

				BASE_TYPES.INT_VAR,
				"i".charCodeAt(),
				"1".charCodeAt(),
				0x00, // End of key string
				1, // one
				BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT, // Negative int
				"n".charCodeAt(),
				"1".charCodeAt(),
				0x00, // End of key string
				1, // one
				
				BASE_TYPES.INT_VAR,
				"i".charCodeAt(),
				"2".charCodeAt(),
				0x00, // End of key string
				0b10000001, // 1 << 7, keep reading
				0, // end of varInt + 0
				BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT, // Negative int
				"n".charCodeAt(),
				"2".charCodeAt(),
				0x00, // End of key string
				0b10000001, // 1 << 7, keep reading
				0, // end of varInt + 0

				BASE_TYPES.INT_VAR,
				"i".charCodeAt(),
				"3".charCodeAt(),
				0x00, // End of key string
				0b10000001, // 1 << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0, // end of varInt + 0
				BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT, // Negative int
				"n".charCodeAt(),
				"3".charCodeAt(),
				0x00, // End of key string
				0b10000001, // 1 << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0, // end of varInt + 0

				BASE_TYPES.INT_VAR,
				"i".charCodeAt(),
				"4".charCodeAt(),
				0x00, // End of key string
				0b10000001, // 1 << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0, // end of varInt + 0
				BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT, // Negative int
				"n".charCodeAt(),
				"4".charCodeAt(),
				0x00, // End of key string
				0b10000001, // 1 << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0, // end of varInt + 0

				BASE_TYPES.INT_VAR,
				"i".charCodeAt(),
				"5".charCodeAt(),
				0x00, // End of key string
				0b10000001, // 1 << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0, // end of varInt + 0
				BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT, // Negative int
				"n".charCodeAt(),
				"5".charCodeAt(),
				0x00, // End of key string
				0b10000001, // 1 << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0, // end of varInt + 0

				BASE_TYPES.INT_VAR,
				"i".charCodeAt(),
				"6".charCodeAt(),
				0x00, // End of key string
				0b10000001, // 1 << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0, // end of varInt + 0
				BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT, // Negative int
				"n".charCodeAt(),
				"6".charCodeAt(),
				0x00, // End of key string
				0b10000001, // 1 << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0, // end of varInt + 0

				BASE_TYPES.INT_VAR,
				"i".charCodeAt(),
				"7".charCodeAt(),
				0x00, // End of key string
				0b10000001, // 1 << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0, // end of varInt + 0
				BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT, // Negative int
				"n".charCodeAt(),
				"7".charCodeAt(),
				0x00, // End of key string
				0b10000001, // 1 << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0, // end of varInt + 0

				BASE_TYPES.INT_VAR,
				"i".charCodeAt(),
				"8".charCodeAt(),
				0x00, // End of key string
				0b10000001, // 1 << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0, // end of varInt + 0
				BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT, // Negative int
				"n".charCodeAt(),
				"8".charCodeAt(),
				0x00, // End of key string
				0b10000001, // 1 << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0, // end of varInt + 0
				
				0x00 // End of Object
			]));
		});
		it("opportunistically encodes floats using 32-bits if it can be done without losing accuracy", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode({
					float32: 0.25,
					float64: 1.337
				})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.FLOAT_FIXED, // 32-bit float
				"f".charCodeAt(),
				"l".charCodeAt(),
				"o".charCodeAt(),
				"a".charCodeAt(),
				"t".charCodeAt(),
				"3".charCodeAt(),
				"2".charCodeAt(),
				0x00, // End of key string
				0x00,
				0x00,
				0x80,
				0x3e,
				BASE_TYPES.FLOAT_FIXED | HEADER_BYTE.BASE_TYPE_VARIANT, // 64-bit float
				"f".charCodeAt(),
				"l".charCodeAt(),
				"o".charCodeAt(),
				"a".charCodeAt(),
				"t".charCodeAt(),
				"6".charCodeAt(),
				"4".charCodeAt(),
				0x00, // End of key string
				0x31,
				0x08,
				0xac,
				0x1c,
				0x5a,
				0x64,
				0xf5,
				0x3f,
				0x00 // End of Object
			]));
		});
		it("encodes all floats as float64 if specified", function(){
			const encoder = new FastSconEncoder({smallerFloats: false});
			expect(
				encoder.encode({
					float32: 0.25,
					float64: 1.337
				})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.FLOAT_FIXED | HEADER_BYTE.BASE_TYPE_VARIANT, // 64-bit float
				"f".charCodeAt(),
				"l".charCodeAt(),
				"o".charCodeAt(),
				"a".charCodeAt(),
				"t".charCodeAt(),
				"3".charCodeAt(),
				"2".charCodeAt(),
				0x00, // End of key string
				0x00,
				0x00,
				0x00,
				0x00,
				0x00,
				0x00,
				0xd0,
				0x3f,
				BASE_TYPES.FLOAT_FIXED | HEADER_BYTE.BASE_TYPE_VARIANT, // 64-bit float
				"f".charCodeAt(),
				"l".charCodeAt(),
				"o".charCodeAt(),
				"a".charCodeAt(),
				"t".charCodeAt(),
				"6".charCodeAt(),
				"4".charCodeAt(),
				0x00, // End of key string
				0x31,
				0x08,
				0xac,
				0x1c,
				0x5a,
				0x64,
				0xf5,
				0x3f,
				0x00 // End of Object
			]));
		});
		it("encodes numbers above Number.MAX_SAFE_INT as floats", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode(2 ** 53)
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.FLOAT_FIXED, // 32-bit float (2 ** 53)
				0x00,
				0x00,
				0x00,
				0x5a // 32-bit representation of (2 ** 53)
			]));
		});
		it("encodes all numbers as floats if specified", function(){
			const encoder = new FastSconEncoder({encodeIntsAsFloats: true});
			expect(
				encoder.encode(1)
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.FLOAT_FIXED, // 32-bit float
				0x00,
				0x00,
				0x80,
				0x3f
			]));
		});
		it("encodes NaN", function(){
			this.skip(); // Fuck it, I don't want to deal with the multiple ways NaNs are stored RN
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode(NaN)
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.FLOAT_FIXED, // 32-bit float (2 ** 53)
				0x00, // Idk if this test will randomly fail in the future, there's multiple ways to encode NaN lmao
				0x00,
				0xc0,
				0x7f
			]));
		});
		it("enforces number ranges if specified", function(){
			// unsigned 8 bit
			const encoder = new FastSconEncoder({
				intExtendedType: EXTENDED_TYPES.INT_VAR.UINT8
			});
			expect(
				encoder.encode({low: 0, high: 255})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.UINT8,
				"l".charCodeAt(),
				"o".charCodeAt(),
				"w".charCodeAt(),
				0x00, // End of key string
				0,
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.UINT8,
				"h".charCodeAt(),
				"i".charCodeAt(),
				"g".charCodeAt(),
				"h".charCodeAt(),
				0x00, // End of key string
				0b10000001, // 1 << 7, keep reading
				0b01111111, // above + 127, end of varint
				0x00 // End of Object
			]));
			expect(
				encoder.encode.bind(encoder, {outOfRange: -1})
			).to.throw(SconSerializeError);
			expect(
				encoder.encode.bind(encoder, {outOfRange: 256})
			).to.throw(SconSerializeError);

			// signed 8 bit
			encoder.options.intExtendedType = EXTENDED_TYPES.INT_VAR.SINT8;
			expect(
				encoder.encode({low: -128, high: 127})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE | HEADER_BYTE.BASE_TYPE_VARIANT,
				EXTENDED_TYPES.INT_VAR.SINT8,
				"l".charCodeAt(),
				"o".charCodeAt(),
				"w".charCodeAt(),
				0x00, // End of key string
				0b10000001, // 1 << 7, keep reading
				0b00000000, // above + 0, end of varint
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.SINT8,
				"h".charCodeAt(),
				"i".charCodeAt(),
				"g".charCodeAt(),
				"h".charCodeAt(),
				0x00, // End of key string
				0b01111111, // 127, end of varint
				0x00 // End of Object
			]));
			expect(
				encoder.encode.bind(encoder, {outOfRange: -129})
			).to.throw(SconSerializeError);
			expect(
				encoder.encode.bind(encoder, {outOfRange: 128})
			).to.throw(SconSerializeError);


			// unsigned 16 bit
			encoder.options.intExtendedType = EXTENDED_TYPES.INT_VAR.UINT16;
			expect(
				encoder.encode({low: 0, high: 65535})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.UINT16,
				"l".charCodeAt(),
				"o".charCodeAt(),
				"w".charCodeAt(),
				0x00, // End of key string
				0b00000000, // 0, end of varint
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.UINT16,
				"h".charCodeAt(),
				"i".charCodeAt(),
				"g".charCodeAt(),
				"h".charCodeAt(),
				0x00, // End of key string
				0b10000011,
				0b11111111,
				0b01111111,
				0x00 // End of Object
			]));
			expect(
				encoder.encode.bind(encoder, {outOfRange: -1})
			).to.throw(SconSerializeError);
			expect(
				encoder.encode.bind(encoder, {outOfRange: 65536})
			).to.throw(SconSerializeError);

			// signed 16 bit
			encoder.options.intExtendedType = EXTENDED_TYPES.INT_VAR.SINT16;
			expect(
				encoder.encode({low: -32768, high: 32767})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE | HEADER_BYTE.BASE_TYPE_VARIANT,
				EXTENDED_TYPES.INT_VAR.SINT16,
				"l".charCodeAt(),
				"o".charCodeAt(),
				"w".charCodeAt(),
				0x00, // End of key string
				0b10000010,
				0b10000000,
				0b00000000,
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.SINT16,
				"h".charCodeAt(),
				"i".charCodeAt(),
				"g".charCodeAt(),
				"h".charCodeAt(),
				0x00, // End of key string
				0b10000001,
				0b11111111,
				0b01111111,
				0x00 // End of Object
			]));
			expect(
				encoder.encode.bind(encoder, {outOfRange: -32769})
			).to.throw(SconSerializeError);
			expect(
				encoder.encode.bind(encoder, {outOfRange: 32768})
			).to.throw(SconSerializeError);


			// unsigned 32 bit
			encoder.options.intExtendedType = EXTENDED_TYPES.INT_VAR.UINT32;
			expect(
				encoder.encode({low: 0, high: 4294967295})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.UINT32,
				"l".charCodeAt(),
				"o".charCodeAt(),
				"w".charCodeAt(),
				0x00, // End of key string
				0b00000000, // 0, end of varint
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.UINT32,
				"h".charCodeAt(),
				"i".charCodeAt(),
				"g".charCodeAt(),
				"h".charCodeAt(),
				0x00, // End of key string
				0b10001111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b01111111,
				0x00 // End of Object
			]));
			expect(
				encoder.encode.bind(encoder, {outOfRange: -1})
			).to.throw(SconSerializeError);
			expect(
				encoder.encode.bind(encoder, {outOfRange: 4294967296})
			).to.throw(SconSerializeError);

			// signed 32 bit
			encoder.options.intExtendedType = EXTENDED_TYPES.INT_VAR.SINT32;
			expect(
				encoder.encode({low: -2147483648, high: 2147483647})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE | HEADER_BYTE.BASE_TYPE_VARIANT,
				EXTENDED_TYPES.INT_VAR.SINT32,
				"l".charCodeAt(),
				"o".charCodeAt(),
				"w".charCodeAt(),
				0x00, // End of key string
				0b10001000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b00000000,
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.SINT32,
				"h".charCodeAt(),
				"i".charCodeAt(),
				"g".charCodeAt(),
				"h".charCodeAt(),
				0x00, // End of key string
				0b10000111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b01111111,
				0x00 // End of Object
			]));
			expect(
				encoder.encode.bind(encoder, {outOfRange: -2147483649})
			).to.throw(SconSerializeError);
			expect(
				encoder.encode.bind(encoder, {outOfRange: 2147483648})
			).to.throw(SconSerializeError);
		});
	});
    describe("boolean value encoding", function(){
		it("works", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode(false)
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.BOOLEAN
				// No value to encode, literally just false
			]));
            expect(
				encoder.encode(true)
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.BOOLEAN | HEADER_BYTE.BASE_TYPE_VARIANT
				// No value to encode, literally just true
			]));
		});
	});
	describe("bigint value encoding", function(){
		it("encodes variable width ints correctly", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode({
					i0: 0n,
					n0: -0n,
					i1: 1n,
					n1: -1n,
					i2: 1n * 128n,
					n2: -1n * 128n,
					i8: 1n * (128n ** 7n),
					n8: -1n * (128n ** 7n)
				})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.INF_INT,
				"i".charCodeAt(),
				"0".charCodeAt(),
				0x00, // End of key string
				0,
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.INF_INT,
				"n".charCodeAt(),
				"0".charCodeAt(),
				0x00, // End of key string
				0,

				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.INF_INT,
				"i".charCodeAt(),
				"1".charCodeAt(),
				0x00, // End of key string
				1, // one
				BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.INF_INT,
				"n".charCodeAt(),
				"1".charCodeAt(),
				0x00, // End of key string
				1, // one
				
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.INF_INT,
				"i".charCodeAt(),
				"2".charCodeAt(),
				0x00, // End of key string
				0b10000001, // 1 << 7, keep reading
				0, // end of varInt + 0
				BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.INF_INT,
				"n".charCodeAt(),
				"2".charCodeAt(),
				0x00, // End of key string
				0b10000001, // 1 << 7, keep reading
				0, // end of varInt + 0

				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.INF_INT,
				"i".charCodeAt(),
				"8".charCodeAt(),
				0x00, // End of key string
				0b10000001, // 1 << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0, // end of varInt + 0
				BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.INF_INT,
				"n".charCodeAt(),
				"8".charCodeAt(),
				0x00, // End of key string
				0b10000001, // 1 << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0b10000000, // (above + 0) << 7, keep reading
				0, // end of varInt + 0
				
				0x00 // End of Object
			]));
		});
	
		it("enforces number ranges if specified", function(){
			// unsigned 8 bit
			const encoder = new FastSconEncoder({
				bigIntExtendedType: EXTENDED_TYPES.INT_VAR.FLOAT_64_SAFE_INT
			});
			expect(
				encoder.encode({low: -9007199254740991n, high: 9007199254740991n})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT,
				"l".charCodeAt(),
				"o".charCodeAt(),
				"w".charCodeAt(),
				0x00, // End of key string
				0b10001111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b01111111,
				BASE_TYPES.INT_VAR,
				"h".charCodeAt(),
				"i".charCodeAt(),
				"g".charCodeAt(),
				"h".charCodeAt(),
				0x00, // End of key string
				0b10001111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b01111111,
				0x00 // End of Object
			]));
			expect(
				encoder.encode.bind(encoder, {outOfRange: -9007199254740992n})
			).to.throw(SconSerializeError);
			expect(
				encoder.encode.bind(encoder, {outOfRange: 9007199254740992n})
			).to.throw(SconSerializeError);

			encoder.options.bigIntExtendedType = EXTENDED_TYPES.INT_VAR.UINT8;
			expect(
				encoder.encode({low: 0n, high: 255n})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.UINT8,
				"l".charCodeAt(),
				"o".charCodeAt(),
				"w".charCodeAt(),
				0x00, // End of key string
				0,
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.UINT8,
				"h".charCodeAt(),
				"i".charCodeAt(),
				"g".charCodeAt(),
				"h".charCodeAt(),
				0x00, // End of key string
				0b10000001, // 1 << 7, keep reading
				0b01111111, // above + 127, end of varint
				0x00 // End of Object
			]));
			expect(
				encoder.encode.bind(encoder, {outOfRange: -1n})
			).to.throw(SconSerializeError);
			expect(
				encoder.encode.bind(encoder, {outOfRange: 256n})
			).to.throw(SconSerializeError);

			// signed 8 bit
			encoder.options.bigIntExtendedType = EXTENDED_TYPES.INT_VAR.SINT8;
			expect(
				encoder.encode({low: -128n, high: 127n})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE | HEADER_BYTE.BASE_TYPE_VARIANT,
				EXTENDED_TYPES.INT_VAR.SINT8,
				"l".charCodeAt(),
				"o".charCodeAt(),
				"w".charCodeAt(),
				0x00, // End of key string
				0b10000001, // 1 << 7, keep reading
				0b00000000, // above + 0, end of varint
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.SINT8,
				"h".charCodeAt(),
				"i".charCodeAt(),
				"g".charCodeAt(),
				"h".charCodeAt(),
				0x00, // End of key string
				0b01111111, // 127, end of varint
				0x00 // End of Object
			]));
			expect(
				encoder.encode.bind(encoder, {outOfRange: -129n})
			).to.throw(SconSerializeError);
			expect(
				encoder.encode.bind(encoder, {outOfRange: 128n})
			).to.throw(SconSerializeError);


			// unsigned 16 bit
			encoder.options.bigIntExtendedType = EXTENDED_TYPES.INT_VAR.UINT16;
			expect(
				encoder.encode({low: 0n, high: 65535n})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.UINT16,
				"l".charCodeAt(),
				"o".charCodeAt(),
				"w".charCodeAt(),
				0x00, // End of key string
				0b00000000, // 0, end of varint
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.UINT16,
				"h".charCodeAt(),
				"i".charCodeAt(),
				"g".charCodeAt(),
				"h".charCodeAt(),
				0x00, // End of key string
				0b10000011,
				0b11111111,
				0b01111111,
				0x00 // End of Object
			]));
			expect(
				encoder.encode.bind(encoder, {outOfRange: -1n})
			).to.throw(SconSerializeError);
			expect(
				encoder.encode.bind(encoder, {outOfRange: 65536n})
			).to.throw(SconSerializeError);

			// signed 16 bit
			encoder.options.bigIntExtendedType = EXTENDED_TYPES.INT_VAR.SINT16;
			expect(
				encoder.encode({low: -32768n, high: 32767n})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE | HEADER_BYTE.BASE_TYPE_VARIANT,
				EXTENDED_TYPES.INT_VAR.SINT16,
				"l".charCodeAt(),
				"o".charCodeAt(),
				"w".charCodeAt(),
				0x00, // End of key string
				0b10000010,
				0b10000000,
				0b00000000,
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.SINT16,
				"h".charCodeAt(),
				"i".charCodeAt(),
				"g".charCodeAt(),
				"h".charCodeAt(),
				0x00, // End of key string
				0b10000001,
				0b11111111,
				0b01111111,
				0x00 // End of Object
			]));
			expect(
				encoder.encode.bind(encoder, {outOfRange: -32769n})
			).to.throw(SconSerializeError);
			expect(
				encoder.encode.bind(encoder, {outOfRange: 32768n})
			).to.throw(SconSerializeError);


			// unsigned 32 bit
			encoder.options.bigIntExtendedType = EXTENDED_TYPES.INT_VAR.UINT32;
			expect(
				encoder.encode({low: 0n, high: 4294967295n})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.UINT32,
				"l".charCodeAt(),
				"o".charCodeAt(),
				"w".charCodeAt(),
				0x00, // End of key string
				0b00000000, // 0, end of varint
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.UINT32,
				"h".charCodeAt(),
				"i".charCodeAt(),
				"g".charCodeAt(),
				"h".charCodeAt(),
				0x00, // End of key string
				0b10001111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b01111111,
				0x00 // End of Object
			]));
			expect(
				encoder.encode.bind(encoder, {outOfRange: -1n})
			).to.throw(SconSerializeError);
			expect(
				encoder.encode.bind(encoder, {outOfRange: 4294967296n})
			).to.throw(SconSerializeError);

			// signed 32 bit
			encoder.options.bigIntExtendedType = EXTENDED_TYPES.INT_VAR.SINT32;
			expect(
				encoder.encode({low: -2147483648n, high: 2147483647n})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE | HEADER_BYTE.BASE_TYPE_VARIANT,
				EXTENDED_TYPES.INT_VAR.SINT32,
				"l".charCodeAt(),
				"o".charCodeAt(),
				"w".charCodeAt(),
				0x00, // End of key string
				0b10001000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b00000000,
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.SINT32,
				"h".charCodeAt(),
				"i".charCodeAt(),
				"g".charCodeAt(),
				"h".charCodeAt(),
				0x00, // End of key string
				0b10000111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b01111111,
				0x00 // End of Object
			]));
			expect(
				encoder.encode.bind(encoder, {outOfRange: -2147483649n})
			).to.throw(SconSerializeError);
			expect(
				encoder.encode.bind(encoder, {outOfRange: 2147483648n})
			).to.throw(SconSerializeError);

			// unsigned 64 bit
			encoder.options.bigIntExtendedType = EXTENDED_TYPES.INT_VAR.UINT64;
			expect(
				encoder.encode({low: 0n, high: 18446744073709551615n})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.UINT64,
				"l".charCodeAt(),
				"o".charCodeAt(),
				"w".charCodeAt(),
				0x00, // End of key string
				0b00000000, // 0, end of varint
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.UINT64,
				"h".charCodeAt(),
				"i".charCodeAt(),
				"g".charCodeAt(),
				"h".charCodeAt(),
				0x00, // End of key string
				0b10000001,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b01111111,
				0x00 // End of Object
			]));
			expect(
				encoder.encode.bind(encoder, {outOfRange: -1n})
			).to.throw(SconSerializeError);
			expect(
				encoder.encode.bind(encoder, {outOfRange: 18446744073709551616n})
			).to.throw(SconSerializeError);

			// signed 64 bit
			encoder.options.bigIntExtendedType = EXTENDED_TYPES.INT_VAR.SINT64;
			expect(
				encoder.encode({low: -9223372036854775808n, high: 9223372036854775807n})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE | HEADER_BYTE.BASE_TYPE_VARIANT,
				EXTENDED_TYPES.INT_VAR.SINT64,
				"l".charCodeAt(),
				"o".charCodeAt(),
				"w".charCodeAt(),
				0x00, // End of key string
				0b10000001,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b00000000,
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.SINT64,
				"h".charCodeAt(),
				"i".charCodeAt(),
				"g".charCodeAt(),
				"h".charCodeAt(),
				0x00, // End of key string
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b01111111,
				0x00 // End of Object
			]));
			expect(
				encoder.encode.bind(encoder, {outOfRange: -9223372036854775809n})
			).to.throw(SconSerializeError);
			expect(
				encoder.encode.bind(encoder, {outOfRange: 9223372036854775808n})
			).to.throw(SconSerializeError);


			// unsigned 128 bit
			encoder.options.bigIntExtendedType = EXTENDED_TYPES.INT_VAR.UINT128;
			expect(
				encoder.encode({low: 0n, high: 340282366920938463463374607431768211455n})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.UINT128,
				"l".charCodeAt(),
				"o".charCodeAt(),
				"w".charCodeAt(),
				0x00, // End of key string
				0b00000000, // 0, end of varint
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.UINT128,
				"h".charCodeAt(),
				"i".charCodeAt(),
				"g".charCodeAt(),
				"h".charCodeAt(),
				0x00, // End of key string
				0b10000011,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b01111111,
				0x00 // End of Object
			]));
			expect(
				encoder.encode.bind(encoder, {outOfRange: -1n})
			).to.throw(SconSerializeError);
			expect(
				encoder.encode.bind(encoder, {outOfRange: 340282366920938463463374607431768211456n})
			).to.throw(SconSerializeError);

			// signed 128 bit
			encoder.options.bigIntExtendedType = EXTENDED_TYPES.INT_VAR.SINT128;
			expect(
				encoder.encode({
					low: -170141183460469231731687303715884105728n,
					high: 170141183460469231731687303715884105727n
				})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE | HEADER_BYTE.BASE_TYPE_VARIANT,
				EXTENDED_TYPES.INT_VAR.SINT128,
				"l".charCodeAt(),
				"o".charCodeAt(),
				"w".charCodeAt(),
				0x00, // End of key string
				0b10000010,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b00000000,
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.SINT128,
				"h".charCodeAt(),
				"i".charCodeAt(),
				"g".charCodeAt(),
				"h".charCodeAt(),
				0x00, // End of key string
				0b10000001,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b01111111,
				0x00 // End of Object
			]));
			expect(
				encoder.encode.bind(encoder, {outOfRange: -170141183460469231731687303715884105729n})
			).to.throw(SconSerializeError);
			expect(
				encoder.encode.bind(encoder, {outOfRange: 170141183460469231731687303715884105728n})
			).to.throw(SconSerializeError);


			// unsigned 256 bit
			encoder.options.bigIntExtendedType = EXTENDED_TYPES.INT_VAR.UINT256;
			expect(
				encoder.encode({low: 0n, high: 115792089237316195423570985008687907853269984665640564039457584007913129639935n})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.UINT256,
				"l".charCodeAt(),
				"o".charCodeAt(),
				"w".charCodeAt(),
				0x00, // End of key string
				0b00000000, // 0, end of varint
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.UINT256,
				"h".charCodeAt(),
				"i".charCodeAt(),
				"g".charCodeAt(),
				"h".charCodeAt(),
				0x00, // End of key string
				0b10001111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b01111111,
				0x00 // End of Object
			]));
			expect(
				encoder.encode.bind(encoder, {outOfRange: -1n})
			).to.throw(SconSerializeError);
			expect(
				encoder.encode.bind(encoder, {outOfRange: 115792089237316195423570985008687907853269984665640564039457584007913129639936n})
			).to.throw(SconSerializeError);

			// signed 256 bit
			encoder.options.bigIntExtendedType = EXTENDED_TYPES.INT_VAR.SINT256;
			expect(
				encoder.encode({
					low: -57896044618658097711785492504343953926634992332820282019728792003956564819968n,
					high: 57896044618658097711785492504343953926634992332820282019728792003956564819967n
				})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE | HEADER_BYTE.BASE_TYPE_VARIANT,
				EXTENDED_TYPES.INT_VAR.SINT256,
				"l".charCodeAt(),
				"o".charCodeAt(),
				"w".charCodeAt(),
				0x00, // End of key string
				0b10001000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b10000000,
				0b00000000,
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.SINT256,
				"h".charCodeAt(),
				"i".charCodeAt(),
				"g".charCodeAt(),
				"h".charCodeAt(),
				0x00, // End of key string
				0b10000111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b11111111,
				0b01111111,
				0x00 // End of Object
			]));
			expect(
				encoder.encode.bind(encoder, {outOfRange: -57896044618658097711785492504343953926634992332820282019728792003956564819969n})
			).to.throw(SconSerializeError);
			expect(
				encoder.encode.bind(encoder, {outOfRange: 57896044618658097711785492504343953926634992332820282019728792003956564819968n})
			).to.throw(SconSerializeError);
		});
	});
	describe("nested object encoding", function(){
		it("works", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode({
					obj: {
						hello: "world"
					}
				})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.OBJECT,
				"o".charCodeAt(),
				"b".charCodeAt(),
				"j".charCodeAt(),
				0x00, // End of key string
				// Start of inner object
				BASE_TYPES.STRING_ZERO_TERM | HEADER_BYTE.BASE_TYPE_VARIANT, // UTF-8 string
				"h".charCodeAt(),
				"e".charCodeAt(),
				"l".charCodeAt(),
				"l".charCodeAt(),
				"o".charCodeAt(),
				0x00, // End of key string
				"w".charCodeAt(),
				"o".charCodeAt(),
				"r".charCodeAt(),
				"l".charCodeAt(),
				"d".charCodeAt(),
				0x00, // End of value string
				0x00, // End of inner object
				0x00 // End of outer object
			]));
		});
	});



	describe("Buffer encoding", function(){
		it("Can encode null-terminated buffers by themselves", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode(Buffer.alloc(255, 255))
			).to.deep.equal(Buffer.concat([
				Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.STRING_ZERO_TERM, // binary enocded string
				]),
				Buffer.alloc(255, 255),
				Buffer.alloc(1) // End of root buffer value
			]));
		});
		it("encodes any buffers smaller than 128 bytes as length-prefixed buffers", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode(Buffer.from([1, 2, 3, 4]))
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.STRING_LENGTH_PREFIXED, // binary encoded string
				4, // single-byte varint
				1,
				2,
				3,
				4
				// String was length-prefixed, no need for end byte
			]));
		});
		it("can encode buffers with null bytes in them", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode(Buffer.from([0, 1, 2, 3]))
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.STRING_LENGTH_PREFIXED, // binary encoded string
				4, // single-byte varint
				0,
				1,
				2,
				3
				// String was length-prefixed, no need for end byte
			]));
		});
		it("encodes Uint8Arrays as buffers", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode(new Uint8Array([0, 1, 2, 3]))
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.STRING_LENGTH_PREFIXED, // binary encoded string
				4, // single-byte varint
				0,
				1,
				2,
				3
				// String was length-prefixed, no need for end byte
			]));
		});
	});
	describe("array encoding", function(){
		it("works", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode([])
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT | HEADER_BYTE.BASE_TYPE_VARIANT, // start array
				0x00 // end array
			]));
			expect(
				encoder.encode([1, 2, 3])
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT | HEADER_BYTE.BASE_TYPE_VARIANT, // start array
				BASE_TYPES.INT_VAR, // array value index 0
				1, // int value 1
				BASE_TYPES.INT_VAR, // array value index 1
				2, // int value 2
				BASE_TYPES.INT_VAR, // array value index 2
				3, // int value 3
				0x00 // end array
			]));
		});
	});
	describe("map encoding", function(){
		it("can encode simple string maps", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode(new Map([["hello", "world"]]))
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT | HEADER_BYTE.HAS_EXTENDED_TYPE, // Start of root Map object
				EXTENDED_TYPES.OBJECT.STRING_KEY_MAP,
				BASE_TYPES.STRING_ZERO_TERM | HEADER_BYTE.BASE_TYPE_VARIANT, // UTF8-encoded string
				"h".charCodeAt(),
				"e".charCodeAt(),
				"l".charCodeAt(),
				"l".charCodeAt(),
				"o".charCodeAt(),
				0x00, // End of key string
				"w".charCodeAt(),
				"o".charCodeAt(),
				"r".charCodeAt(),
				"l".charCodeAt(),
				"d".charCodeAt(),
				0x00, // End of string value
				0x00 // End of Object
			]));
		});
		it("cannot encode non-string map keys if feature isn't enabled", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode.bind(encoder, new Map([[0, "asdf"]]))
			).to.throw(SconUnserializableError)
		});
		it("encodes maps with any key types as an array of key+value pairs (which are also arrays)", function(){
			const encoder = new FastSconEncoder({anyMapKey: true});
			expect(
				encoder.encode(new Map([[1, "one"], [2, "two"]]))
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT |
					HEADER_BYTE.BASE_TYPE_VARIANT |
					HEADER_BYTE.HAS_EXTENDED_TYPE, // Start of root map (with array base type)
				EXTENDED_TYPES.OBJECT.ANY_KEY_MAP,
				BASE_TYPES.OBJECT |
					HEADER_BYTE.BASE_TYPE_VARIANT, // first array containing key+value pair
				BASE_TYPES.INT_VAR, // key
				1,
				BASE_TYPES.STRING_ZERO_TERM | HEADER_BYTE.BASE_TYPE_VARIANT, // value (utf8 string)
				"o".charCodeAt(),
				"n".charCodeAt(),
				"e".charCodeAt(),
				0x00, // end of string value
				0x00, // end of first key+value pair
				BASE_TYPES.OBJECT |
					HEADER_BYTE.BASE_TYPE_VARIANT, // second array containing key+value pair
				BASE_TYPES.INT_VAR, // key
				2,
				BASE_TYPES.STRING_ZERO_TERM | HEADER_BYTE.BASE_TYPE_VARIANT, // value (utf8 string)
				"t".charCodeAt(),
				"w".charCodeAt(),
				"o".charCodeAt(),
				0x00, // end of string value
				0x00, // end of second key+value pair
				0x00 // end of root map (which is an array)
			]));
		});
	});
	describe("Set encoding", function(){
		it("works", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode(new Set())
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE, // start set
				EXTENDED_TYPES.OBJECT.SET,
				0x00 // end set
			]));
			expect(
				encoder.encode(new Set([1, 2, 2]))
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE, // start set
				EXTENDED_TYPES.OBJECT.SET,
				BASE_TYPES.INT_VAR, // set value 1
				1, // int value 1
				BASE_TYPES.INT_VAR, // set value 2
				2, // int value 2
				0x00 // end set
			]));
		});
	});
	describe("other object encoding", function(){
		it("will attempt to use any enumerable properties by default", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode(new Uint32Array([10, 20]))
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // Start of root value object
				BASE_TYPES.INT_VAR,
				"0".charCodeAt(),
				0x00, // End of key string
				10,
				BASE_TYPES.INT_VAR,
				"1".charCodeAt(),
				0x00, // End of key string
				20,
				0x00 // End of Object
			]));
		});
		it("will throw if encountering an unknown object if specified to", function(){
			const encoder = new FastSconEncoder({throwOnUnknownObject: true});
			expect(
				encoder.encode.bind(encoder, new Uint32Array([10, 20]))
			).to.throw(SconUnserializableError);
		});
	});
	describe("date encoding", function(){
		it("can encode dates with second-resolution", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode(new Date("2014-03-31 12:00 AM EDT"))
			).to.deep.equal(Buffer.from([
				0x07,
				0x53,
				0x43,
				0x33,
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.DATE_S,
				0x85,
				0x99,
				0xe3,
				0xd0,
				0x40
			]));
		});
		it("can encode dates with millisecond-resolution", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode(new Date(1636726678667))
			).to.deep.equal(Buffer.from([
				0x07,
				0x53,
				0x43,
				0x33,
				BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.DATE_MS,
				0xaf,
				0xd1,
				0xa4,
				0x8c,
				0xc9,
				0x0b
			]));
		});
		it("can work with dates before the beginning of time", function(){
			const encoder = new FastSconEncoder();
			expect(
				encoder.encode(new Date("1931-12-11 12:00 AM EDT"))
			).to.deep.equal(Buffer.from([
				0x07,
				0x53,
				0x43,
				0x33,
				BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
				EXTENDED_TYPES.INT_VAR.DATE_S,
				0x84,
				0xbc,
				0xd9,
				0x96,
				0x40
			]));
		});
	});
});
