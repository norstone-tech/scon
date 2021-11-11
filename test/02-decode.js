/* eslint-env mocha */
/* eslint-disable prefer-arrow-callback */
const {expect} = require("chai");
const {SconDecoder, BASE_TYPES, HEADER_BYTE, SconUnserializableError, SconInvalidKeyError, EXTENDED_TYPES, SconSerializeError, SconTruncateError} = require("../");

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
		it("can decode referenced length-prefixed terminated strings");
	});
});
