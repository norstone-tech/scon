const {expect} = require('chai');
const {SconEncoder, BASE_TYPES, HEADER_BYTE, SconUnserializableError, SconInvalidKeyError, EXTENDED_TYPES, SconSerializeError, SconDecoder} = require("../");
const {randomBytes} = require("crypto");

describe("SCON Encoder", function() {
	describe("key+string encoding", function(){
		it("encodes empty objects as a single null byte (magic number explicitly disabled)", function(){
			const encoder = new SconEncoder({magicNumber: false});
			expect(
				encoder.encode({})
			).to.deep.equal(Buffer.from([
				BASE_TYPES.OBJECT, // Start of root value object
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
				BASE_TYPES.OBJECT, // Start of root value object
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
				BASE_TYPES.OBJECT, // Start of root value object
				0x00 // End of Object
			]));
		});
		it("Can encode null-terminated strings by themselves", function(){
			const encoder = new SconEncoder();
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
			const encoder = new SconEncoder();
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
			const encoder = new SconEncoder();
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
				BASE_TYPES.OBJECT, // start of root object
				BASE_TYPES.STRING_ZERO_TERM |
					HEADER_BYTE.BASE_TYPE_VARIANT |
					HEADER_BYTE.KEY_IS_REFERENCE | // Key is a pointer to the first referenced value
					HEADER_BYTE.VALUE_IS_REFERENCE, // Key is a pointer to the second referenced value
				0, // key, index 0 pointing to "hello"
				1, // value, index 1 pointing to "world"
				0x00 // End of root Object
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
				BASE_TYPES.OBJECT, // Start of root value object
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
				0x00 // End of root Object
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
				BASE_TYPES.OBJECT, // Start of root value object
				BASE_TYPES.STRING_LENGTH_PREFIXED |
					HEADER_BYTE.BASE_TYPE_VARIANT |
					HEADER_BYTE.KEY_IS_REFERENCE | // Key is a pointer to the first referenced value
					HEADER_BYTE.VALUE_IS_REFERENCE, // Key is a pointer to the second referenced value
				0, // key, index 0 pointing to "hello"
				1, // value, index 1 pointing to "world"
				0x00 // End of root Object
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
				BASE_TYPES.OBJECT, // Start of root value object
				BASE_TYPES.STRING_ZERO_TERM |
					HEADER_BYTE.BASE_TYPE_VARIANT |
					HEADER_BYTE.KEY_IS_REFERENCE | // Key is a pointer to the first referenced value
					HEADER_BYTE.VALUE_IS_REFERENCE, // Key is a pointer to the second referenced value
				0, // key, index 0 pointing to "hello"
				1, // value, index 1 pointing to "world"
				0x00 // End of root Object
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
		it("ignores undefined object values", function(){
			const encoder = new SconEncoder();
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
			const encoder = new SconEncoder();
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
			const encoder = new SconEncoder({magicNumber: false});
			expect(
				encoder.encode(undefined)
			).to.deep.equal(Buffer.from([
				BASE_TYPES.EOF
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
			const encoder = new SconEncoder();
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
			const encoder = new SconEncoder();
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
			const encoder = new SconEncoder({encodeIntsAsFloats: true});
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
			const encoder = new SconEncoder();
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
			const encoder = new SconEncoder();
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
			const encoder = new SconEncoder();
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
			const encoder = new SconEncoder({
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
		});
	});
	describe("nested object encoding", function(){
		
		it("works", function(){
			this.skip();
			const encoder = new SconEncoder();
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
		it("can encode circular objects", function(){
			this.skip();
			const encoder = new SconEncoder({referencedObjects: true});
			const cir = {};
			cir.cir = cir;
			expect(
				encoder.encode(cir)
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT | HEADER_BYTE.IS_REFERENCE_DEFINITION,
				// Start of referenced object 0
				BASE_TYPES.OBJECT | HEADER_BYTE.VALUE_IS_REFERENCE,
				"c".charCodeAt(),
				"i".charCodeAt(),
				"r".charCodeAt(),
				0x00, // End of key string
				0, // Varint pointer to object 0
				0x00, // End of inner object
				0x00 // End of outer object
			]));
		});
	});
});
