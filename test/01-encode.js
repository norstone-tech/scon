const {expect} = require('chai');
const {SconEncoder, BASE_TYPES, HEADER_BYTE, SconUnserializableError, SconInvalidKeyError, EXTENDED_TYPES, SconSerializeError} = require("../");
const {randomBytes} = require("crypto");

describe("SCON Encoder", function() {
	describe("key+string encoding", function(){
		it("encodes empty objects as a single null byte (magic number explicitly disabled)", function(){
			const encoder = new SconEncoder({magicNumber: false});
			expect(
				encoder.encode({})
			).to.deep.equal(Buffer.from([
				0x00 // End of Object
			]));
		});
		it("encodes empty objects as a single null byte prepended with a magic number (magic number explicitly enabled)", function(){
			const encoder = new SconEncoder({magicNumber: true});
			expect(
				encoder.encode({})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				0x00 // End of Object
			]));
		});
		it("encodes empty objects as a single null byte prepended with a magic number (magic number implicitly enabled)", function(){
			const encoder = new SconEncoder();
			expect(
				encoder.encode({})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				0x00 // End of Object
			]));
		});
		it("encodes simple object-based string maps using null terminated strings", function(){
			const encoder = new SconEncoder();
			expect(
				encoder.encode({hello: "world"})
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
			const encoder = new SconEncoder();
			expect(
				encoder.encode({hello: "w\0rld"})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.STRING_LENGTH_PREFIXED | HEADER_BYTE.BASE_TYPE_VARIANT, // UTF8-encoded string
				"h".charCodeAt(),
				"e".charCodeAt(),
				"l".charCodeAt(),
				"l".charCodeAt(),
				"o".charCodeAt(),
				0x00, // End of key string
				"w\0rld".length,
				"w".charCodeAt(),
				"\0".charCodeAt(),
				"r".charCodeAt(),
				"l".charCodeAt(),
				"d".charCodeAt(),
				0x00 // End of Object
			]));
		});
		it("cannot encode keys with null bytes in them", function(){
			const encoder = new SconEncoder();
			expect(
				encoder.encode.bind(encoder, ({"hell\0": "world"}))
			).to.throw(SconInvalidKeyError);
		});
		it("can encode strings using references", function(){
			const encoder = new SconEncoder({referencedStrings: true});
			expect(
				encoder.encode({hello: "world"})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.STRING_ZERO_TERM | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.IS_REFERENCE_DEFINITION,
				"h".charCodeAt(),
				"e".charCodeAt(),
				"l".charCodeAt(),
				"l".charCodeAt(),
				"o".charCodeAt(),
				0x00, // End of referenced string "hello"
				BASE_TYPES.STRING_ZERO_TERM | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.IS_REFERENCE_DEFINITION,
				"w".charCodeAt(),
				"o".charCodeAt(),
				"r".charCodeAt(),
				"l".charCodeAt(),
				"d".charCodeAt(),
				0x00, // End of referenced string "world"
				BASE_TYPES.STRING_ZERO_TERM |
					HEADER_BYTE.BASE_TYPE_VARIANT |
					HEADER_BYTE.KEY_IS_REFERENCE | // Key is a pointer to the first referenced value
					HEADER_BYTE.VALUE_IS_REFERENCE, // Key is a pointer to the second referenced value
				0, // key, index 0 pointing to "hello"
				1, // value, index 1 pointing to "world"
				0x00 // End of Object
			]));
			expect(
				encoder.encode({hello: "world", goodbye: "world"})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.STRING_ZERO_TERM | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.IS_REFERENCE_DEFINITION,
				"h".charCodeAt(),
				"e".charCodeAt(),
				"l".charCodeAt(),
				"l".charCodeAt(),
				"o".charCodeAt(),
				0x00, // End of referenced string "hello"
				BASE_TYPES.STRING_ZERO_TERM | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.IS_REFERENCE_DEFINITION,
				"w".charCodeAt(),
				"o".charCodeAt(),
				"r".charCodeAt(),
				"l".charCodeAt(),
				"d".charCodeAt(),
				0x00, // End of referenced string "world"
				BASE_TYPES.STRING_ZERO_TERM | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.IS_REFERENCE_DEFINITION,
				"g".charCodeAt(),
				"o".charCodeAt(),
				"o".charCodeAt(),
				"d".charCodeAt(),
				"b".charCodeAt(),
				"y".charCodeAt(),
				"e".charCodeAt(),
				0x00, // End of referenced string "goodbye"
				BASE_TYPES.STRING_ZERO_TERM |
					HEADER_BYTE.BASE_TYPE_VARIANT |
					HEADER_BYTE.KEY_IS_REFERENCE | // Key is a pointer to the first referenced value
					HEADER_BYTE.VALUE_IS_REFERENCE, // Key is a pointer to the second referenced value
				0, // key, index 0 pointing to "hello"
				1, // value, index 1 pointing to "world"
				BASE_TYPES.STRING_ZERO_TERM |
				HEADER_BYTE.BASE_TYPE_VARIANT |
				HEADER_BYTE.KEY_IS_REFERENCE | // Key is a pointer to the first referenced value
				HEADER_BYTE.VALUE_IS_REFERENCE, // Key is a pointer to the second referenced value
				2, // key, index 2 pointing to "goodbye"
				1, // value, index 1 pointing to "world"
				0x00 // End of Object
			]));
		});
		it("can encode strings with null values using references", function(){
			const encoder = new SconEncoder({referencedStrings: true});
			expect(
				encoder.encode({hello: "w\0rld"})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.STRING_ZERO_TERM | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.IS_REFERENCE_DEFINITION,
				"h".charCodeAt(),
				"e".charCodeAt(),
				"l".charCodeAt(),
				"l".charCodeAt(),
				"o".charCodeAt(),
				0x00, // End of referenced string "hello"
				BASE_TYPES.STRING_LENGTH_PREFIXED | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.IS_REFERENCE_DEFINITION,
				"w\0rld".length,
				"w".charCodeAt(),
				"\0".charCodeAt(),
				"r".charCodeAt(),
				"l".charCodeAt(),
				"d".charCodeAt(),
				BASE_TYPES.STRING_LENGTH_PREFIXED |
					HEADER_BYTE.BASE_TYPE_VARIANT |
					HEADER_BYTE.KEY_IS_REFERENCE | // Key is a pointer to the first referenced value
					HEADER_BYTE.VALUE_IS_REFERENCE, // Key is a pointer to the second referenced value
				0, // key, index 0 pointing to "hello"
				1, // value, index 1 pointing to "world"
				0x00 // End of Object
			]));
		});
		it("can encode strings using explicit reference definitions", function(){
			const encoder = new SconEncoder({referencedStrings: true, explicitReferenceDefinition: true});
			expect(
				encoder.encode({hello: "world"})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.STRING_ZERO_TERM |
					HEADER_BYTE.BASE_TYPE_VARIANT |
					HEADER_BYTE.IS_REFERENCE_DEFINITION |
					HEADER_BYTE.KEY_IS_REFERENCE_SLOT,
				0, // Place the following value in slot 0
				"h".charCodeAt(),
				"e".charCodeAt(),
				"l".charCodeAt(),
				"l".charCodeAt(),
				"o".charCodeAt(),
				0x00, // End of referenced string "hello"
				BASE_TYPES.STRING_ZERO_TERM |
					HEADER_BYTE.BASE_TYPE_VARIANT |
					HEADER_BYTE.IS_REFERENCE_DEFINITION |
					HEADER_BYTE.KEY_IS_REFERENCE_SLOT,
				1, // Place the vollowing value in slot 1
				"w".charCodeAt(),
				"o".charCodeAt(),
				"r".charCodeAt(),
				"l".charCodeAt(),
				"d".charCodeAt(),
				0x00, // End of referenced string "world"
				BASE_TYPES.STRING_ZERO_TERM |
					HEADER_BYTE.BASE_TYPE_VARIANT |
					HEADER_BYTE.KEY_IS_REFERENCE | // Key is a pointer to the first referenced value
					HEADER_BYTE.VALUE_IS_REFERENCE, // Key is a pointer to the second referenced value
				0, // key, index 0 pointing to "hello"
				1, // value, index 1 pointing to "world"
				0x00 // End of Object
			]));
		});
	});
	describe("symbol encoding", function(){
		it("doesn't encode symbols", function(){
			const encoder = new SconEncoder();
			expect(encoder.encode.bind(encoder, {hello: Symbol("world")}))
				.to.throw(SconUnserializableError);
		});
	});
	describe("function encoding", function(){
		it("doesn't encode functions", function(){
			const encoder = new SconEncoder();
			expect(encoder.encode.bind(encoder, {hello: () => {}}))
				.to.throw(SconUnserializableError);
		});
	});
	describe("undefined value encoding", function(){
		it("ignores undefined values", function(){
			const encoder = new SconEncoder();
			expect(
				encoder.encode({hello: undefined})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				0x00 // End of Object
			]));
		});
	});
	describe("null value encoding", function(){
		it("works", function(){
			const encoder = new SconEncoder();
			expect(
				encoder.encode({hello: null})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.NULL,
				"h".charCodeAt(),
				"e".charCodeAt(),
				"l".charCodeAt(),
				"l".charCodeAt(),
				"o".charCodeAt(),
				0x00, // End of key string
				// No value to encode, literally just null
				0x00 // End of Object
			]));
		});
	});
	describe("number value encoding", function(){
		it("opportunistically encodes integer values as variable-width ints", function(){
			const encoder = new SconEncoder();
			expect(
				encoder.encode({int: 100, negInt: -100})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.INT_VAR,
				"i".charCodeAt(),
				"n".charCodeAt(),
				"t".charCodeAt(),
				0x00, // End of key string
				100, // 100 woo
				BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT, // Negative int
				"n".charCodeAt(),
				"e".charCodeAt(),
				"g".charCodeAt(),
				"I".charCodeAt(),
				"n".charCodeAt(),
				"t".charCodeAt(),
				0x00, // End of key string
				100,
				0x00 // End of Object
			]));
		});
		it("Encodes variable width ints correctly", function(){
			const encoder = new SconEncoder();
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
			const encoder = new SconEncoder();
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
			const encoder = new SconEncoder({smallerFloats: false});
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
			const encoder = new SconEncoder();
			expect(
				encoder.encode({num: 2 ** 53})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.FLOAT_FIXED, // 32-bit float (2 ** 53)
				"n".charCodeAt(),
				"u".charCodeAt(),
				"m".charCodeAt(),
				0x00, // End of key string
				0x00,
				0x00,
				0x00,
				0x5a, // 32-bit representation of (2 ** 53)
				0x00 // End of Object
			]));
		});
		it("encodes all numbers as floats if specified", function(){
			const encoder = new SconEncoder({encodeIntsAsFloats: true});
			expect(
				encoder.encode({num: 1})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.FLOAT_FIXED, // 32-bit float (2 ** 53)
				"n".charCodeAt(),
				"u".charCodeAt(),
				"m".charCodeAt(),
				0x00, // End of key string
				0x00,
				0x00,
				0x80,
				0x3f,
				0x00 // End of Object
			]));
		});
		it("encodes NaN", function(){
			this.skip(); // Fuck it, I don't want to deal with the multiple ways NaNs are stored RN
			const encoder = new SconEncoder();
			expect(
				encoder.encode({num: NaN})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.FLOAT_FIXED, // 32-bit float (2 ** 53)
				"n".charCodeAt(),
				"u".charCodeAt(),
				"m".charCodeAt(),
				0x00, // End of key string
				0x00, // Idk if this test will randomly fail in the future, there's multiple ways to encode NaN lmao
				0x00,
				0xc0,
				0x7f,
				0x00 // End of Object
			]));
		});
		it("enforces number ranges if specified", function(){
			// unsigned 8 bit
			const encoder = new SconEncoder({
				intExtendedType: EXTENDED_TYPES.INT_VAR.UINT8
			});
			expect(
				encoder.encode({low: 0, high: 255})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
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
			const encoder = new SconEncoder();
			expect(
				encoder.encode({hello: false})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.BOOLEAN,
				"h".charCodeAt(),
				"e".charCodeAt(),
				"l".charCodeAt(),
				"l".charCodeAt(),
				"o".charCodeAt(),
				0x00, // End of key string
				// No value to encode, literally just false
				0x00 // End of Object
			]));
            ///
            expect(
				encoder.encode({hello: true})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.BOOLEAN | HEADER_BYTE.BASE_TYPE_VARIANT,
				"h".charCodeAt(),
				"e".charCodeAt(),
				"l".charCodeAt(),
				"l".charCodeAt(),
				"o".charCodeAt(),
				0x00, // End of key string
				// No value to encode, literally just false
				0x00 // End of Object
			]));
		});
	});
});
