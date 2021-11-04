const {expect} = require('chai');
const {SconEncoder, BASE_TYPES, HEADER_BYTE, SconUnserializableError, SconInvalidKeyError} = require("../");
const {randomBytes} = require("crypto");

describe("SCON Encoder", function() {
    describe("Key+string encoding", function(){
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
    describe("Symbol encoding", function(){
        it("doesn't encode symbols", function(){
            const encoder = new SconEncoder();
            expect(encoder.encode.bind(encoder, {hello: Symbol("world")}))
                .to.throw(SconUnserializableError);
        });
    });
    describe("Undefined encoding", function(){
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
});
