/* eslint-env mocha */
/* eslint-disable prefer-arrow-callback */
const chai = require("chai");
chai.use(require("chai-datetime"));
const {expect} = chai;
const {SconDecoder, BASE_TYPES, HEADER_BYTE, SconUnserializableError, SconInvalidKeyError, EXTENDED_TYPES, SconSerializeError, SconTruncateError, SconReferenceError, SconMagicNumberError, SconParseError} = require("../");

describe("SCON Decoder", function(){
	describe("basic object and string decoding", function(){
		it("can decode empty objects (magic number explicitly disabled)", function(){
			const decoder = new SconDecoder({magicNumber: false});
			expect(
				decoder.decode(Buffer.from([
					BASE_TYPES.OBJECT, // Start of root value object
					0x00 // End of Object
				]))
			).to.deep.equal({});
		});
		it("can decode empty objects (magic number explicitly enabled)", function(){
			const decoder = new SconDecoder({magicNumber: true});
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.OBJECT, // Start of root value object
					0x00 // End of Object
				]))
			).to.deep.equal({});
		});
		it("can decode empty objects (magic number implicitly enabled)", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.OBJECT, // Start of root value object
					0x00 // End of Object
				]))
			).to.deep.equal({});
		});
		it("throws a truncate error if the magic number is truncated", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43 // C
				]))
			).to.throw(SconTruncateError);
		});
		it("Works with Uint8Arrays", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(new Uint8Array([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.OBJECT, // Start of root value object
					0x00 // End of Object
				]))
			).to.deep.equal({});
		});
		it("throws if the magic number is incorrect", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x32, // 2
					BASE_TYPES.OBJECT, // Start of root value object
					0x00 // End of Object
				]))
			).to.throw(SconMagicNumberError)
		});
		it("throws when there's an object with no end", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.OBJECT // Start of root value object
				]))
			).to.throw(SconTruncateError);
		});
		it("can decode a null terminated string as a root value", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
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
				]))
			).to.deep.equal("hello, world!");
		});
		it("throws when there's a string with no end", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode.bind(decoder, Buffer.from([
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
				]))
			).to.throw(SconTruncateError);
		});
		it("decodes simple object-based string maps using null terminated strings", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
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
				]))
			).to.deep.equal({hello: "world"});
		});
		it("throws when an object doesn't end", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode.bind(decoder, Buffer.from([
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
				]))
			).to.throw(SconTruncateError)
		});
		it("ignores potentially unsafe properties", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.OBJECT, // Start of root value object
					BASE_TYPES.STRING_ZERO_TERM | HEADER_BYTE.BASE_TYPE_VARIANT, // UTF8-encoded string
					"t".charCodeAt(),
					"o".charCodeAt(),
					"S".charCodeAt(),
					"t".charCodeAt(),
					"r".charCodeAt(),
					"i".charCodeAt(),
					"n".charCodeAt(),
					"g".charCodeAt(),
					0x00, // End of key string
					"e".charCodeAt(),
					"v".charCodeAt(),
					"i".charCodeAt(),
					"l".charCodeAt(),
					0x00, // End of string value
					0x00 // End of Object
				]))
			).to.deep.equal({});
		});
		it("can decode strings with null bytes in them", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
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
				]))
			).to.deep.equal("hello,\0world!");
		});
		it("throws if the length of the string goes beyond the buffer length", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.STRING_LENGTH_PREFIXED | HEADER_BYTE.BASE_TYPE_VARIANT, // UTF8-encoded string
					"hello".length,
					"h".charCodeAt(),
					"e".charCodeAt(),
				]))
			).to.throw(SconTruncateError);
		});
		it("can decode referenced null-terminated strings", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
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
				]))
			).to.deep.equal({hello: "world"});
			expect(
				decoder.decode(Buffer.from([
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
				]))
			).to.deep.equal({hello: "world", goodbye: "world"});
		});
		it("can decode referenced length-prefixed terminated strings", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.STRING_LENGTH_PREFIXED | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.IS_REFERENCE_DEFINITION,
					"hello".length,
					"h".charCodeAt(),
					"e".charCodeAt(),
					"l".charCodeAt(),
					"l".charCodeAt(),
					"o".charCodeAt(),
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
				]))
			).to.deep.equal({hello: "w\0rld"});
		});
		it("can decode referenced length-prefixed terminated strings (out of order definition)", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.STRING_LENGTH_PREFIXED | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.IS_REFERENCE_DEFINITION,
					"w\0rld".length,
					"w".charCodeAt(),
					"\0".charCodeAt(),
					"r".charCodeAt(),
					"l".charCodeAt(),
					"d".charCodeAt(),
					BASE_TYPES.STRING_LENGTH_PREFIXED | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.IS_REFERENCE_DEFINITION,
					"hello".length,
					"h".charCodeAt(),
					"e".charCodeAt(),
					"l".charCodeAt(),
					"l".charCodeAt(),
					"o".charCodeAt(),

					BASE_TYPES.OBJECT, // Start of root value object
					BASE_TYPES.STRING_LENGTH_PREFIXED |
						HEADER_BYTE.BASE_TYPE_VARIANT |
						HEADER_BYTE.KEY_IS_REFERENCE | // Key is a pointer to the first referenced value
						HEADER_BYTE.VALUE_IS_REFERENCE, // Key is a pointer to the second referenced value
					1, // key, index 1 pointing to "hello"
					0, // value, index 0 pointing to "world"
					0x00 // End of root Object
				]))
			).to.deep.equal({hello: "w\0rld"});
		});
		it("can decode strings with explicitly defined references", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
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
				]))
			).to.deep.equal({hello: "world"});
		});
		it("can decode strings with explicitly defined references (out of order definition)", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.STRING_ZERO_TERM |
						HEADER_BYTE.BASE_TYPE_VARIANT |
						HEADER_BYTE.IS_REFERENCE_DEFINITION |
						HEADER_BYTE.KEY_IS_REFERENCE_SLOT,
					3, // Place the following value in slot 3
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
					2, // Place the vollowing value in slot 2
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
					3, // key, index 0 pointing to "hello"
					2, // value, index 1 pointing to "world"
					0x00 // End of root Object
				]))
			).to.deep.equal({hello: "world"});
		});
		it("throws when a referenced key contains a null byte", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.STRING_LENGTH_PREFIXED |
						HEADER_BYTE.BASE_TYPE_VARIANT |
						HEADER_BYTE.IS_REFERENCE_DEFINITION |
						HEADER_BYTE.KEY_IS_REFERENCE_SLOT,
					0, // Place the following value in slot 0
					"hell\0".length,
					"h".charCodeAt(),
					"e".charCodeAt(),
					"l".charCodeAt(),
					"l".charCodeAt(),
					"\0".charCodeAt(),
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
				]))
			).to.throw(SconReferenceError);
		});
		it("throws when a referenced key leads to a slot out of bounds", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode.bind(decoder, Buffer.from([
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
					0x00,
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
					2, // key, index 0 pointing to "hello"
					1, // value, index 1 pointing to "world"
					0x00 // End of root Object
				]))
			).to.throw(SconReferenceError);
		});
		it("throws when a referenced value leads to a slot out of bounds", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode.bind(decoder, Buffer.from([
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
					0x00,
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
					2, // value, index 1 pointing to "world"
					0x00 // End of root Object
				]))
			).to.throw(SconReferenceError);
		});
		it("throws when a referenced key isn't a string", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR |
						HEADER_BYTE.IS_REFERENCE_DEFINITION |
						HEADER_BYTE.KEY_IS_REFERENCE_SLOT,
					0, // Place the following value in slot 0
					69, // THE GREATEST NUMBER, I'LL BET ALL MY MONEY ON IT
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
					0, // key, index 0 pointing to 69
					1, // value, index 1 pointing to "world"
					0x00 // End of root Object
				]))
			).to.throw(SconReferenceError);
		});
		
	});
	describe("undefined value decoding", function(){
		it("returns undefined when only encountering an EOF", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.EOF
				]))
			).to.be.undefined;
		});
	});
	describe("null value decoding", function(){
		it("works", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.OBJECT, // start of root object
					BASE_TYPES.NULL, // value type is null
					"h".charCodeAt(),
					"e".charCodeAt(),
					"l".charCodeAt(),
					"l".charCodeAt(),
					"o".charCodeAt(),
					0x00, // End of key string
					// No value to encode, literally just null
					0x00 // End of root Object
				]))
			).to.deep.equal({hello: null});
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.NULL // Root value is null. That's it
				]))
			).to.be.null;
		});
	});
	describe("number value decoding", function(){
		it("can decode 32-bit floats", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.FLOAT_FIXED,
					0x00,
					0x00,
					0xc0,
					0x7f
				]))
			).to.be.NaN;
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.FLOAT_FIXED,
					0xff,
					0xff,
					0xff,
					0xff
				]))
			).to.be.NaN;
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.FLOAT_FIXED,
					0x00,
					0x00,
					0x00,
					0x3e
				]))
			).to.equal(0.125);
		});
		it("can decode 64-bit floats", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.FLOAT_FIXED | HEADER_BYTE.BASE_TYPE_VARIANT,
					0xff,
					0xff,
					0xff,
					0xff,
					0xff,
					0xff,
					0xff,
					0xff
				]))
			).to.be.NaN;
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.FLOAT_FIXED | HEADER_BYTE.BASE_TYPE_VARIANT,
					0x18,
					0x2d,
					0x44,
					0x54,
					0xfb,
					0x21,
					0x09,
					0x40
				]))
			).to.equal(Math.PI);
		});
		it("can decode variable-length ints", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR,
					0
				]))
			).to.equal(0);
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR,
					127
				]))
			).to.equal(127);
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT,
					127
				]))
			).to.equal(-127);
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR,
					0b11000000,
					0b01011001
				]))
			).to.equal(0b10000001011001);
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT,
					0b11000000,
					0b01011001
				]))
			).to.equal(-0b10000001011001);
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR,
					0b11000000,
					0b11000001,
					0b01011001
				]))
			).to.equal(0b100000010000011011001);
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT,
					0b11000000,
					0b11000001,
					0b01011001
				]))
			).to.equal(-0b100000010000011011001);
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR,
					0b10001111,
					0b11111111,
					0b11111111,
					0b11111111,
					0b11111111,
					0b11111111,
					0b11111111,
					0b01111111
				]))
			).to.equal(Number.MAX_SAFE_INTEGER);
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT,
					0b10001111,
					0b11111111,
					0b11111111,
					0b11111111,
					0b11111111,
					0b11111111,
					0b11111111,
					0b01111111
				]))
			).to.equal(-Number.MAX_SAFE_INTEGER);
		});
		it("throws if there's a varint with no end", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR,
					0b10000000
				]))
			).to.throw(SconTruncateError)
		});
		it("throws if a decoded varint falls outside an expected range", function(){
			// JS-safe int
			const decoder = new SconDecoder();
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR,
					// 2 ** 53, greater than Number.MAX_SAFE_INTEGER
					0b10010000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b00000000
				]))
			).to.throw(SconParseError);
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT,
					// (-2) ** 53, less than Number.MIN_SAFE_INTEGER
					0b10010000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b00000000
				]))
			).to.throw(SconParseError);
			// sint 8
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.SINT8,
					127
				]))
			).to.equal(127);
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.SINT8,
					0b10000001,
					0b00000000
				]))
			).to.equal(-128);
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.SINT8,
					// 128
					0b10000001,
					0b00000000
				]))
			).to.throw(SconParseError);
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.SINT8,
					// -129
					0b10000001,
					0b00000001
				]))
			).to.throw(SconParseError);

			// uint 8
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.UINT8,
					0b10000001,
					0b01111111
				]))
			).to.equal(255);
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.UINT8,
					0
				]))
			).to.equal(0);
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.UINT8,
					// 256
					0b10000010,
					0b00000000
				]))
			).to.throw(SconParseError);
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.UINT8,
					// -1
					0b00000001,
				]))
			).to.throw(SconParseError);

			// sint 16
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.SINT16,
					0b10000001,
					0b11111111,
					0b01111111
				]))
			).to.equal(32767);
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.SINT16,
					0b10000010,
					0b10000000,
					0b00000000
				]))
			).to.equal(-32768);
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.SINT16,
					// 32768
					0b10000010,
					0b10000000,
					0b00000000
				]))
			).to.throw(SconParseError);
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.SINT16,
					// -32769
					0b10000010,
					0b10000000,
					0b00000001
				]))
			).to.throw(SconParseError);

			// uint 16
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.UINT16,
					0b10000011,
					0b11111111,
					0b01111111
				]))
			).to.equal(65535);
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.UINT16,
					0
				]))
			).to.equal(0);
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.UINT16,
					// 65536
					0b10000100,
					0b10000000,
					0b00000000
				]))
			).to.throw(SconParseError);
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.UINT16,
					// -1
					0b00000001,
				]))
			).to.throw(SconParseError);

			// sint 32
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.SINT32,
					0b10000111,
					0b11111111,
					0b11111111,
					0b11111111,
					0b01111111
				]))
			).to.equal(2147483647);
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.SINT32,
					0b10001000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b00000000
				]))
			).to.equal(-2147483648);
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.SINT32,
					// 4294967296
					0b10001000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b00000000
				]))
			).to.throw(SconParseError);
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.SINT32,
					// -4294967297
					0b10001000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b00000001
				]))
			).to.throw(SconParseError);

			// uint 32
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.UINT32,
					0b10001111,
					0b11111111,
					0b11111111,
					0b11111111,
					0b01111111
				]))
			).to.equal(4294967295);
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.UINT32,
					0
				]))
			).to.equal(0);
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.UINT32,
					// 4294967296
					0b10010000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b00000000
				]))
			).to.throw(SconParseError);
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.UINT32,
					// -1
					0b00000001,
				]))
			).to.throw(SconParseError);
		});
	});
	describe("date decoding", function(){
		it("works (second resolution)", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.DATE_S,
					0x85,
					0x99,
					0xe3,
					0xd0,
					0x40
				]))
			).to.equalTime(new Date("2014-03-31 12:00 AM EDT"));
		});
		it("works (millisecond resolution)", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.DATE_MS,
					0xaf,
					0xd1,
					0xa4,
					0x8c,
					0xc9,
					0x0b
				]))
			).to.equalTime(new Date(1636726678667));
		});
		it("works (negative timestamp)", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.DATE_S,
					0x84,
					0xbc,
					0xd9,
					0x96,
					0x40
				]))
			).to.equalTime(new Date("1931-12-11 12:00 AM EDT"));
		});
	});
	describe("boolean value decoding", function(){
		it("works", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.BOOLEAN
				]))
			).to.be.false;
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.BOOLEAN | HEADER_BYTE.BASE_TYPE_VARIANT
				]))
			).to.be.true;
		});
	});
	describe("bigint decoding", function(){
		it("works", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.INF_INT,
					127
				]))
			).to.equal(127n);
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.INF_INT,
					127
				]))
			).to.equal(-127n);
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.INF_INT,
					0xe2,
					0x84,
					0xca,
					0xfb,
					0xd8,
					0xea,
					0xea,
					0xfd,
					0xe3,
					0xc3,
					0xf1,
					0xa3,
					0xb2,
					0xfa,
					0x9b,
					0xe3,
					0x83,
					0xab,
					0x9b,
					0xbb,
					0x80,
					0xbc,
					0x93,
					0xaa,
					0x92,
					0xed,
					0x8b,
					0xe0,
					0xeb,
					0x89,
					0xd0,
					0xc1,
					0xaf,
					0xfa,
					0xc7,
					0xc1,
					0xde,
					0xfe,
					0xc9,
					0x8f,
					0xb4,
					0xd6,
					0xa2,
					0xd4,
					0x8b,
					0xab,
					0xb7,
					0xa0,
					0xd8,
					0xc3,
					0xf9,
					0xa8,
					0xab,
					0xe3,
					0xf8,
					0x8c,
					0x97,
					0x8b,
					0xad,
					0xf9,
					0xde,
					0x84,
					0x95,
					0x8c,
					0x97,
					0x87,
					0xcc,
					0xa0,
					0x81,
					0xf8,
					0xb2,
					0xdf,
					0x2e
				]))
			// Generated with BigInt("0x" + crypto.randomBytes(64).toString("hex")) lmao
			).to.equal(0x62092bdd8d5abee387c51b2f46f183566dd80784d512da2f06b13420aff51e0defd247b4ac8aa0b56dd05887e542bc7e061716b7cde08546170f31001f0cafaen);
		});
		it("throws if a decoded bigint falls outside an expected range", function(){
			const decoder = new SconDecoder();
			// sint 64
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.SINT64,
					0b11111111,
					0b11111111,
					0b11111111,
					0b11111111,
					0b11111111,
					0b11111111,
					0b11111111,
					0b11111111,
					0b01111111
				]))
			).to.equal(9223372036854775807n);
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.SINT64,
					0b10000001,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b00000000
				]))
			).to.equal(-9223372036854775808n);
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.SINT64,
					// 9223372036854775808n
					0b10000001,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b00000000
				]))
			).to.throw(SconParseError);
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.SINT64,
					// -9223372036854775809n
					0b10000001,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b00000001
				]))
			).to.throw(SconParseError);

			// uint 64
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.UINT64,
					0b10000001,
					0b11111111,
					0b11111111,
					0b11111111,
					0b11111111,
					0b11111111,
					0b11111111,
					0b11111111,
					0b11111111,
					0b01111111
				]))
			).to.equal(18446744073709551615n);
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.UINT64,
					0
				]))
			).to.equal(0n);
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.UINT64,
					// 18446744073709551616
					0b10000010,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b00000000
				]))
			).to.throw(SconParseError);
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.UINT64,
					// -1
					0b00000001,
				]))
			).to.throw(SconParseError);

			// sint 128
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.SINT128,
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
					0b01111111
				]))
			).to.equal(170141183460469231731687303715884105727n);
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.SINT128,
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
					0b00000000
				]))
			).to.equal(-170141183460469231731687303715884105728n);
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.SINT128,
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
					0b00000000
				]))
			).to.throw(SconParseError);
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.SINT128,
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
					0b00000001
				]))
			).to.throw(SconParseError);

			// uint 128
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.UINT128,
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
					0b01111111
				]))
			).to.equal(340282366920938463463374607431768211455n);
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.UINT128,
					0
				]))
			).to.equal(0n);
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.UINT128,
					0b10000100,
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
					0b00000000
				]))
			).to.throw(SconParseError);
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.UINT128,
					// -1
					0b00000001,
				]))
			).to.throw(SconParseError);

			// sint 256
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.SINT256,
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
					0b01111111
				]))
			).to.equal(57896044618658097711785492504343953926634992332820282019728792003956564819967n);
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.SINT256,
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
					0b00000000
				]))
			).to.equal(-57896044618658097711785492504343953926634992332820282019728792003956564819968n);
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.SINT256,
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
					0b00000000
				]))
			).to.throw(SconParseError);
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.SINT256,
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
					0b00000001
				]))
			).to.throw(SconParseError);

			// uint 256
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.UINT256,
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
					0b01111111
				]))
			).to.equal(115792089237316195423570985008687907853269984665640564039457584007913129639935n);
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.UINT256,
					0
				]))
			).to.equal(0n);
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.UINT256,
					0b10010000,
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
					0b00000000
				]))
			).to.throw(SconParseError);
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE,
					EXTENDED_TYPES.INT_VAR.UINT256,
					// -1
					0b00000001,
				]))
			).to.throw(SconParseError);
		});
	});
	describe("nested object decoding", function(){
		it("works", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.OBJECT, // start of root object
					BASE_TYPES.OBJECT, // start of inner object
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
				]))
			).to.deep.equal({
				obj: {
					hello: "world"
				}
			});
		});
		it("can decode circular objects", function(){
			const decoder = new SconDecoder();
			const decoded = decoder.decode(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT | HEADER_BYTE.IS_REFERENCE_DEFINITION, // Start of referenced object 0
				BASE_TYPES.OBJECT | HEADER_BYTE.VALUE_IS_REFERENCE, // start of "cir" property definition
				"c".charCodeAt(),
				"i".charCodeAt(),
				"r".charCodeAt(),
				0x00, // End of key string
				0, // Varint pointer to object 0
				0x00, // end of referenced object 0
				BASE_TYPES.OBJECT | HEADER_BYTE.VALUE_IS_REFERENCE, // root object definition
				0 // Varint pointer to object 0
			]));
			expect(decoded.cir).to.equal(decoded);
		});
		it("can decode circular objects (explicit definition)", function(){
			const decoder = new SconDecoder();
			const decoded = decoder.decode(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				// Start of referenced object 0
				BASE_TYPES.OBJECT | HEADER_BYTE.IS_REFERENCE_DEFINITION | HEADER_BYTE.KEY_IS_REFERENCE_SLOT, 
				5, // explicitly defining reference 5
				BASE_TYPES.OBJECT | HEADER_BYTE.VALUE_IS_REFERENCE, // start of "cir" property definition
				"c".charCodeAt(),
				"i".charCodeAt(),
				"r".charCodeAt(),
				0x00, // End of key string
				5, // Varint pointer to object 5
				0x00, // end of referenced object 5
				BASE_TYPES.OBJECT | HEADER_BYTE.VALUE_IS_REFERENCE, // root object definition
				5 // Varint pointer to object 5
			]));
			expect(decoded.cir).to.equal(decoded);
		});
		it("can decode nested objects with re-used referenced property names", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.STRING_ZERO_TERM | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.IS_REFERENCE_DEFINITION,
					"o".charCodeAt(),
					"b".charCodeAt(),
					"j".charCodeAt(),
					0x00, // End of referenced string
					BASE_TYPES.OBJECT, // Start of root object
					BASE_TYPES.OBJECT | HEADER_BYTE.KEY_IS_REFERENCE, // start of object property "obj"
					0, // pointer to "obj"
					BASE_TYPES.OBJECT | HEADER_BYTE.KEY_IS_REFERENCE, // start of nested object property "obj"
					0, // pointer to "obj"
					0x00, // end of inner-most object
					0x00, // end of middle-object
					0x00 // end of root object
				]))
			).to.deep.equal({
				obj: {
					obj: {}
				}
			});
		});
	});
	describe("buffer decoding", function(){
		it("decodes null-terminated binary strings", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.STRING_ZERO_TERM,
					"h".charCodeAt(),
					"a".charCodeAt(),
					0x00
				]))
			).to.deep.equal(Buffer.from("ha"));
		});
		it("decodes length-prefixed binary strings", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.STRING_LENGTH_PREFIXED,
					2,
					"h".charCodeAt(),
					"a".charCodeAt()
				]))
			).to.deep.equal(Buffer.from("ha"));
		});
		it("returns a sub-array when decoding buffers by default (null terminated)", function(){
			const encoded = Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.STRING_ZERO_TERM,
				"h".charCodeAt(),
				"a".charCodeAt(),
				0x00
			]);
			const decoder = new SconDecoder();
			/**@type {Buffer} */
			const decoded = decoder.decode(encoded);
			encoded[5] = "b".charCodeAt();
			expect(decoded).to.deep.equal(Buffer.from("ba"));
		});
		it("returns a sub-array when decoding buffers by default (length prefix)", function(){
			const encoded = Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.STRING_LENGTH_PREFIXED,
				2,
				"h".charCodeAt(),
				"a".charCodeAt()
			]);
			const decoder = new SconDecoder();
			/**@type {Buffer} */
			const decoded = decoder.decode(encoded);
			encoded[6] = "b".charCodeAt();
			expect(decoded).to.deep.equal(Buffer.from("ba"));
		});
		it("returns a copied array when decoding buffers if specified (null terminated)", function(){
			const encoded = Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.STRING_ZERO_TERM,
				"h".charCodeAt(),
				"a".charCodeAt(),
				0x00
			]);
			const decoder = new SconDecoder({copyOnBufferRead: true});
			/**@type {Buffer} */
			const decoded = decoder.decode(encoded);
			encoded[5] = "b".charCodeAt();
			expect(decoded).to.deep.equal(Buffer.from("ha"));
		});
		it("returns a copied array when decoding buffers if specified (length prefixed)", function(){
			const encoded = Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.STRING_LENGTH_PREFIXED,
				2,
				"h".charCodeAt(),
				"a".charCodeAt()
			]);
			const decoder = new SconDecoder({copyOnBufferRead: true});
			/**@type {Buffer} */
			const decoded = decoder.decode(encoded);
			encoded[6] = "b".charCodeAt();
			expect(decoded).to.deep.equal(Buffer.from("ha"));
		});
	});
	describe("array decoding", function(){
		it("works", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.OBJECT | HEADER_BYTE.BASE_TYPE_VARIANT, // start array
					0x00 // end array
				]))
			).to.deep.equal([]);
			expect(
				decoder.decode(Buffer.from([
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
					0x00 // end arra
				]))
			).to.deep.equal([1, 2, 3]);
		});
		it("can contain itself", function(){
			const decoder = new SconDecoder();
			const decoded = decoder.decode(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT |
					HEADER_BYTE.BASE_TYPE_VARIANT |
					HEADER_BYTE.IS_REFERENCE_DEFINITION, // start referenced array 0
				BASE_TYPES.OBJECT | 
					HEADER_BYTE.BASE_TYPE_VARIANT |
					HEADER_BYTE.VALUE_IS_REFERENCE, // array value index 0
				0, // pointer to referenced value 0
				0x00, // end referenced array 0
				BASE_TYPES.OBJECT | 
					HEADER_BYTE.BASE_TYPE_VARIANT |
					HEADER_BYTE.VALUE_IS_REFERENCE, // root object definition
				0 // pointer to referenced value 0
			]));
			expect(decoded[0]).to.equal(decoded);
		});
	});
	describe("set decoding", function(){
		it("works", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.OBJECT | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE, // start array
					EXTENDED_TYPES.OBJECT.SET,
					0x00 // end array
				]))
			).to.be.instanceOf(Set);
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.OBJECT | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE, // start array
					EXTENDED_TYPES.OBJECT.SET,
					BASE_TYPES.INT_VAR, // array value index 0
					1, // int value 1
					BASE_TYPES.INT_VAR, // array value index 1
					2, // int value 2
					BASE_TYPES.INT_VAR, // array value index 2
					3, // int value 3
					0x00 // end arra
				]))
			).to.deep.equal(new Set([1, 2, 3]));
		});
		it("can contain itself", function(){
			const decoder = new SconDecoder();
			const decoded = decoder.decode(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT |
					HEADER_BYTE.BASE_TYPE_VARIANT |
					HEADER_BYTE.IS_REFERENCE_DEFINITION |
					HEADER_BYTE.HAS_EXTENDED_TYPE, // start referenced array 0
				EXTENDED_TYPES.OBJECT.SET,
				BASE_TYPES.OBJECT | 
					HEADER_BYTE.BASE_TYPE_VARIANT |
					HEADER_BYTE.VALUE_IS_REFERENCE, // array value index 0
				0, // pointer to referenced value 0
				0x00, // end referenced array 0
				BASE_TYPES.OBJECT | 
					HEADER_BYTE.BASE_TYPE_VARIANT |
					HEADER_BYTE.VALUE_IS_REFERENCE, // root object definition
				0 // pointer to referenced value 0
			]));
			expect(decoded).to.contain(decoded);
		});
	});
	describe("map decoding", function(){
		it("can decode simple string maps", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
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
				]))
			).to.deep.equal(new Map([["hello", "world"]]));
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.OBJECT | HEADER_BYTE.HAS_EXTENDED_TYPE, // Start of root Map object
					EXTENDED_TYPES.OBJECT.STRING_KEY_MAP_ALT,
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
				]))
			).to.deep.equal(new Map([["hello", "world"]]));
		});
		it("can decode maps which contain themselves", function(){
			const decoder = new SconDecoder();
			/**@type {Map<string, Map>} */
			const decoded = decoder.decode(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT | HEADER_BYTE.IS_REFERENCE_DEFINITION | HEADER_BYTE.HAS_EXTENDED_TYPE, // Start of referenced object 0
				EXTENDED_TYPES.OBJECT.STRING_KEY_MAP,
				// start of "cir" property definition (extended type doesn't need to be defined here)
				BASE_TYPES.OBJECT | HEADER_BYTE.VALUE_IS_REFERENCE, 
				"c".charCodeAt(),
				"i".charCodeAt(),
				"r".charCodeAt(),
				0x00, // End of key string
				0, // Varint pointer to object 0
				0x00, // end of referenced object 0
				BASE_TYPES.OBJECT | HEADER_BYTE.VALUE_IS_REFERENCE, // root object definition
				0 // Varint pointer to object 0
			]));
			expect(
				decoded.get("cir")
			).to.equal(decoded);
		});
		it("can decode maps with any key type", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decode(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					// Start of root Map object (array of key+value pairs)
					BASE_TYPES.OBJECT | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.HAS_EXTENDED_TYPE, 
					EXTENDED_TYPES.OBJECT.ANY_KEY_MAP,

					// start of first key+value pair
					BASE_TYPES.OBJECT | HEADER_BYTE.BASE_TYPE_VARIANT,
					BASE_TYPES.INT_VAR, // key is an int
					1, // key is 1
					BASE_TYPES.STRING_ZERO_TERM | HEADER_BYTE.BASE_TYPE_VARIANT, // value is a utf8 string
					"o".charCodeAt(),
					"n".charCodeAt(),
					"e".charCodeAt(),
					0x00, // end of value string
					0x00, // end of first key+value pair

					// start of second key+value pair
					BASE_TYPES.OBJECT | HEADER_BYTE.BASE_TYPE_VARIANT,
					BASE_TYPES.INT_VAR, // key is an int
					2, // key is 2
					BASE_TYPES.STRING_ZERO_TERM | HEADER_BYTE.BASE_TYPE_VARIANT, // value is a utf8 string
					"t".charCodeAt(),
					"w".charCodeAt(),
					"o".charCodeAt(),
					0x00, // end of value string
					0x00, // end of second key+value pair

					// start of third key+value pair
					BASE_TYPES.OBJECT | HEADER_BYTE.BASE_TYPE_VARIANT,
					BASE_TYPES.INT_VAR, // key is an int
					3, // key is 3
					BASE_TYPES.STRING_ZERO_TERM | HEADER_BYTE.BASE_TYPE_VARIANT, // value is a utf8 string
					"t".charCodeAt(),
					"h".charCodeAt(),
					"r".charCodeAt(),
					"e".charCodeAt(),
					"e".charCodeAt(),
					0x00, // end of value string
					0x00, // end of third key+value pair

					// start of fourth key+value pair
					BASE_TYPES.OBJECT | HEADER_BYTE.BASE_TYPE_VARIANT,
					BASE_TYPES.STRING_ZERO_TERM | HEADER_BYTE.BASE_TYPE_VARIANT, // key is a utf8 string
					"4".charCodeAt(),
					0x00, // end of key string
					BASE_TYPES.STRING_ZERO_TERM | HEADER_BYTE.BASE_TYPE_VARIANT, // value is a utf8 string
					"f".charCodeAt(),
					"o".charCodeAt(),
					"u".charCodeAt(),
					"r".charCodeAt(),
					0x00, // end of value string
					0x00, // end of fourth key+value pair
					0x00 // End of root array
				]))
			).to.deep.equal(
				new Map([
					[1, "one"],
					[2, "two"],
					[3, "three"],
					["4", "four"]
				])
			);
		});
	});
	describe("cross-object referencing", function(){
		it("can use previously defined references if specified", function(){
			const decoder = new SconDecoder({
				keepReferenceValues: true,
				magicNumber: false
			});
			const firstObject = decoder.decode(Buffer.from([
				BASE_TYPES.STRING_ZERO_TERM | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.IS_REFERENCE_DEFINITION,
				"h".charCodeAt(),
				"e".charCodeAt(),
				"l".charCodeAt(),
				"l".charCodeAt(),
				"o".charCodeAt(),
				0x00,
				BASE_TYPES.STRING_ZERO_TERM | HEADER_BYTE.BASE_TYPE_VARIANT | HEADER_BYTE.IS_REFERENCE_DEFINITION,
				"w".charCodeAt(),
				"o".charCodeAt(),
				"r".charCodeAt(),
				"l".charCodeAt(),
				"d".charCodeAt(),
				0x00,
				BASE_TYPES.OBJECT | HEADER_BYTE.IS_REFERENCE_DEFINITION, // object will be defined at index 2
				BASE_TYPES.STRING_ZERO_TERM |
					HEADER_BYTE.BASE_TYPE_VARIANT |
					HEADER_BYTE.KEY_IS_REFERENCE |
					HEADER_BYTE.VALUE_IS_REFERENCE,
				0, // varint pointer to "hello"
				1, // varint pointer to world
				0x00, // end of referenced object
				BASE_TYPES.OBJECT | HEADER_BYTE.VALUE_IS_REFERENCE, // object will be defined at index 2
				2 // varint pointer to referenced object
			]));
			expect(firstObject).to.deep.equal({hello: "world"});
			const secondObject = decoder.decode(Buffer.from([
				BASE_TYPES.OBJECT,
				BASE_TYPES.OBJECT |
					HEADER_BYTE.KEY_IS_REFERENCE |
					HEADER_BYTE.VALUE_IS_REFERENCE,
				0, // pointer to "hello"
				2, // pointer to firstObject
				0x00 // end of root object
			]));
			expect(secondObject).to.deep.equal({hello: {hello: "world"}});
			expect(secondObject.hello).to.equal(firstObject);
		});
		it("can use previously defined references if specified (explicit ref definitions)", function(){
			const decoder = new SconDecoder({
				keepReferenceValues: true,
				magicNumber: false
			});
			const firstObject = decoder.decode(Buffer.from([
				BASE_TYPES.STRING_ZERO_TERM |
					HEADER_BYTE.BASE_TYPE_VARIANT |
					HEADER_BYTE.IS_REFERENCE_DEFINITION |
					HEADER_BYTE.KEY_IS_REFERENCE_SLOT,
				1, // TODO: Testing these defined out of order since that's how they're encoded rn
				"h".charCodeAt(),
				"e".charCodeAt(),
				"l".charCodeAt(),
				"l".charCodeAt(),
				"o".charCodeAt(),
				0x00,
				BASE_TYPES.STRING_ZERO_TERM |
					HEADER_BYTE.BASE_TYPE_VARIANT |
					HEADER_BYTE.IS_REFERENCE_DEFINITION |
					HEADER_BYTE.KEY_IS_REFERENCE_SLOT,
				2,
				"w".charCodeAt(),
				"o".charCodeAt(),
				"r".charCodeAt(),
				"l".charCodeAt(),
				"d".charCodeAt(),
				0x00,
				BASE_TYPES.OBJECT |
					HEADER_BYTE.IS_REFERENCE_DEFINITION |
					HEADER_BYTE.KEY_IS_REFERENCE_SLOT,
				0,
				BASE_TYPES.STRING_ZERO_TERM |
					HEADER_BYTE.BASE_TYPE_VARIANT |
					HEADER_BYTE.KEY_IS_REFERENCE |
					HEADER_BYTE.VALUE_IS_REFERENCE,
				1, // varint pointer to "hello"
				2, // varint pointer to world
				0x00, // end of referenced object
				BASE_TYPES.OBJECT | HEADER_BYTE.VALUE_IS_REFERENCE, // object will be defined at index 2
				0 // varint pointer to referenced object
			]));
			expect(firstObject).to.deep.equal({hello: "world"});
			const secondObject = decoder.decode(Buffer.from([
				BASE_TYPES.OBJECT |
					HEADER_BYTE.IS_REFERENCE_DEFINITION |
					HEADER_BYTE.KEY_IS_REFERENCE_SLOT,
				3,
				BASE_TYPES.OBJECT |
					HEADER_BYTE.KEY_IS_REFERENCE |
					HEADER_BYTE.VALUE_IS_REFERENCE,
				1, // pointer to "hello"
				0, // pointer to firstObject
				0x00, // end of referenced object
				BASE_TYPES.OBJECT | HEADER_BYTE.VALUE_IS_REFERENCE, // root value
				3 // varint pointer to referenced object
			]));
			expect(secondObject).to.deep.equal({hello: {hello: "world"}});
			expect(secondObject.hello).to.equal(firstObject);
		});
		it("can \"forget\" previous reference definitions if specified", function(){
			const decoder = new SconDecoder({
				keepReferenceValues: true,
				magicNumber: false
			});
			expect(
				decoder.decode(Buffer.from([
					BASE_TYPES.STRING_ZERO_TERM |
						HEADER_BYTE.BASE_TYPE_VARIANT |
						HEADER_BYTE.IS_REFERENCE_DEFINITION,
					"a".charCodeAt(),
					0x00,
					BASE_TYPES.STRING_ZERO_TERM |
						HEADER_BYTE.BASE_TYPE_VARIANT |
						HEADER_BYTE.VALUE_IS_REFERENCE,
					0 // point to slot 0
				]))
			).to.equal("a");
			expect(
				decoder.decode(Buffer.from([
					BASE_TYPES.STRING_ZERO_TERM |
						HEADER_BYTE.BASE_TYPE_VARIANT |
						HEADER_BYTE.VALUE_IS_REFERENCE,
					0 // point to slot 0
				]))
			).to.equal("a");
			decoder.options.keepReferenceValues = false;
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					BASE_TYPES.STRING_ZERO_TERM |
						HEADER_BYTE.BASE_TYPE_VARIANT |
						HEADER_BYTE.VALUE_IS_REFERENCE,
					0 // point to slot 0
				]))
			).to.throw(SconReferenceError);
		});
	});
	describe("multi-buffer decode", function(){
		it("works, probably", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decodePartial(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.OBJECT, // Start of root value object
					BASE_TYPES.STRING_ZERO_TERM | HEADER_BYTE.BASE_TYPE_VARIANT, // UTF8-encoded string
					"h".charCodeAt(),
					"e".charCodeAt(),
					"l".charCodeAt(),
				]))
			).to.be.undefined;
			expect(
				decoder.decodePartial(Buffer.from([
					"l".charCodeAt(),
					"o".charCodeAt(),
					0x00, // End of key string
					"w".charCodeAt(),
					"o".charCodeAt(),
					"r".charCodeAt(),
					"l".charCodeAt(),
					"d".charCodeAt(),
					0x00 // End of string value
				]))
			).to.be.undefined;
			expect(
				decoder.decodePartial(Buffer.from([
					0x00 // End of Object
				]))
			).to.deep.equal({hello: "world"});
		});
		it("works, probably, with Uint8Arrays", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decodePartial(new Uint8Array([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.OBJECT, // Start of root value object
					BASE_TYPES.STRING_ZERO_TERM | HEADER_BYTE.BASE_TYPE_VARIANT, // UTF8-encoded string
					"h".charCodeAt(),
					"e".charCodeAt(),
					"l".charCodeAt(),
				]))
			).to.be.undefined;
			expect(
				decoder.decodePartial(new Uint8Array([
					"l".charCodeAt(),
					"o".charCodeAt(),
					0x00, // End of key string
					"w".charCodeAt(),
					"o".charCodeAt(),
					"r".charCodeAt(),
					"l".charCodeAt(),
					"d".charCodeAt(),
					0x00 // End of string value
				]))
			).to.be.undefined;
			expect(
				decoder.decodePartial(new Uint8Array([
					0x00 // End of Object
				]))
			).to.deep.equal({hello: "world"});
		});
		it("doesn't allow a full decode while doing a partial decode", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decodePartial(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.OBJECT, // Start of root value object
					BASE_TYPES.STRING_ZERO_TERM | HEADER_BYTE.BASE_TYPE_VARIANT, // UTF8-encoded string
					"h".charCodeAt(),
					"e".charCodeAt(),
					"l".charCodeAt(),
				]))
			).to.be.undefined;
			expect(
				decoder.decode.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.OBJECT, // Start of root value object
					0x00 // end of root object
				]))
			).to.throw(SconParseError);
		});
		it("can use previously defined references accross multiple partial decodes", function(){
			const decoder = new SconDecoder({
				keepReferenceValues: true,
				magicNumber: false
			});
			expect(
				decoder.decodePartial(Buffer.from([
					BASE_TYPES.STRING_ZERO_TERM |
						HEADER_BYTE.BASE_TYPE_VARIANT |
						HEADER_BYTE.IS_REFERENCE_DEFINITION,
					"a".charCodeAt(),
					0x00,
					BASE_TYPES.STRING_ZERO_TERM |
						HEADER_BYTE.BASE_TYPE_VARIANT |
						HEADER_BYTE.VALUE_IS_REFERENCE
				]))
			).to.be.undefined;
			expect(
				decoder.decodePartial(Buffer.from([
					0 // point to slot 0
				]))
			).to.equal("a");
			expect(
				decoder.decodePartial(Buffer.from([
					BASE_TYPES.STRING_ZERO_TERM |
						HEADER_BYTE.BASE_TYPE_VARIANT |
						HEADER_BYTE.VALUE_IS_REFERENCE,
					0 // point to slot 0
				]))
			).to.equal("a");
		});
		it("passes on non-truncated related errors", function(){
			const decoder = new SconDecoder();
			expect(
				decoder.decodePartial.bind(decoder, Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x33, // 3
					BASE_TYPES.INT_VAR,
					// 2 ** 53, greater than Number.MAX_SAFE_INTEGER
					0b10010000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b10000000,
					0b00000000
				]))
			).to.throw(SconParseError);
		});
	});
});
