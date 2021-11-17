# Swift-Cardinal Object Notation 3 (SCON3)

Special thanks to James R Swift for creating the specifications and implementing the original SCON format

## About

SCON3 is an extendable binary object serialization format created to store and transfer data more efficiently than the popular JSON standard. Created by Aritz J Beobide-Cardinal (ARitz Cracker).

This repo implements the `SCON3` format in JS. While using zero(ish) dependencies. (Requires NodeJS-like buffer objects. Check out [buffer-lite](https://github.com/aritz-cracker/buffer-lite) for web browser use!)

### Differences from native JSON.parse/JSON.stringify
* SCON3 is (sometimes) faster
  * Depends on the data set, but currently this library seems to perform best when used with large objects with large string or number values
* SCON3 produces significantly smaller output, however, as it is a binary format, it isn't intended to be human-readable
* SCON3 can serialize objects with circular references
* SCON3 can serialize several value types not supported by JSON without any additional user processing
  * Full `BigInt` support no need for you to `toString` them and parse afterwards
  * Full `Date` support, no need for you to construct them yourself
  * Full `Buffer` support. Transparently encoded binary data, woo!
  * Full `Set` support
  * Full `Map` support


### Differences from protobuf/pbf
* SCON3 doesn't rely on having a pre-defined schema, which means output will be larger in most circumstances.
  * Though as a benefit, this means SCON3 is more flexible at storing arbitrary data at runtime.
* SCON3 can store string-mapped values (either as normal `Object`s or `Map`s), while with pbf you'll have to encode them as parallel arrays yourself.
* SCON3 can serialize objects with circular references
* SCON3 gives you more control on how you can store your ints and BigInts, ensuring what you decode will be exactly what you intended to encode

### Future development
* Encoding performance improvements are planned for 3.0.X patches
* SCON 3.1.0 is planned to support user-definable types, which will allow for your own classes to be serialized using SCON3!

## Installation

```shell
npm install scon
```
## Usage

A website containing reference documentation is "coming soon™". For now, you can check out the JS doc comments everywhere.

Here's a basic example...
```js
const {encode, decode, SconEncoder, SconDecoder} = require("scon");
// Encode/decode with default options
const defaultEncoded = encode({hello: "world!"});
console.log(defaultEncoded); // <Buffer 07 53 43 33 e0 b0 68 65 6c 6c 6f 00 77 6f 72 6c 64 21 00 00>
const defaultDecoded = decode(defaultEncoded);
console.log(defaultDecoded); // { hello: 'world!' }

// Encode with non-string map keys enabled, and without magic number
const sconEnc = new SconEncoder({anyMapKey: true, magicNumber: false});
const anyMapKeyEncoded = sconEnc.encode(new Map([[0, 1]]));
console.log(anyMapKeyEncoded); // <Buffer f8 02 f0 80 00 80 01 00 00>
// Decode without magic number
const sconDec = new SconDecoder({magicNumber: false});
const anyMapKeyDecoded = sconDec.decode(anyMapKeyEncoded);
console.log(anyMapKeyDecoded); // Map(1) { 0 => 1 }
```

## Contributing

Pull requests are welcome! Please ensure `npm run test:full` succeeds before submitting any. That ensures that the code follows the coding style (as enforced by `npm run lint`) and that all test succeed with 100% code coverage (as enforced by `npm run test:cov`)

## Release History
* 3.0.0
  * Overhauled file structure and codebase for better space and parsing efficiency
    * Scon file type is (potentialy) now forward compatible, with user-definable types
  * Added support for `Date` `Set` and `Map` objects
  * Depends on NodeJS-style `Buffer`s again. Good thing there's `buffer-lite`

* 2.1.2
  * Fixed encoding objects with defined `undefined` values

* 2.1.1
  * Fixed a stack overflow when syncronously decoding large files

* 2.1.0
  * Codebase has been re-written, yet the encode and decode functions still remain backwards compatible with 2.0
  * Added circular object support
  * Added the pointer datatype, which can point to referencedValue datatypes. This can be used to encode larger objects like strings once and then use references to them in order to save space
  * New and improved tests now with 100% more code coverage!

* 2.0.1
  * Switched to NodeJS buffer functions for optimization, but falls back to Uint8Arrays for cross-platform use
  * Added scon.streamDecode

* 2.0.0 
  * Now uses Uint8Array instead of NodeJS Buffer for browser support
  * Now differentiates between human readable strings and byte arrays. Use Uint8Array to store binary data and Javascript strings to store utf8
  * booleans are now stored more efficiently
  * infinity/negative-infinity values are now stored more efficiently
  * keys no longer take up an unnecessary byte.
  * 0 values will now no-longer take up unnecessary space.
  * scon.partialDecode added which allows for decoding partial scon files, documentation soon!
  
* 1.1.0 Ints now take up less bytes depending on how big they are. Also, bugfixes.
* 1.0.3 Added TravisCI intergration and tests
* 1.0.2 Added support for NaN and 64 bit floats
* 1.0.0 Added support for arrays, booleans, and nulls!
* 0.9.2 ???
* 0.9.0 Major update in module structure, and added error handling.
* 0.8.2 Removed left over tests.
* 0.8.0 Initial release
