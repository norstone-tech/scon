Swift-Cardinal Object Notation (SCON)
=========

[![NPM][npm-image]][npm-url]

[![Node.js Version][node-version-image]][node-version-url]
[![Build status][build-status-image]][build-status-url]
[![Coverage Status](https://coveralls.io/repos/github/BlueStone-Tech-Enterprises/scon/badge.svg)](https://coveralls.io/github/BlueStone-Tech-Enterprises/scon)
[![License][license-image]][license-url]

A minimal node module allowing the reading and writing of data in the SCON format.
The SCON format, created by Aritz J Beobide-Cardinal (ARitz Cracker) and James R Swift, is an extendable binary file format that was created to store data more efficiently than the popular JSON standard.

## Installation

```shell
npm install scon --save
```

## Usage

```js
const useMagicNumber = true; //If useMagicNumber is undefined or null, it will default to true;
const scon = require( 'scon', useMagicNumber );

// If you wish to encode binary data, use NodeJS Buffers or Uint8Arrays
let encoded = scon.encode( { hello: "world!", five: 5 } );
// encoded will be a Buffer or Uint8Array depending on the platform you're using it on.

// decoded is now { hello: "world!", five: 5 }
let decoded = scon.decode( encoded, useMagicNumber );

// The second argument can also be an options object, the options are defined as so:
/*
{
	useMagicNumber, // Whether or not to use the magic number. Defaults to true
	noDupeStrings, // If enabled, strings (for both keys and values) will be stored as references. This ensures that all strings are stored once. This may increase file size if the amount of unique strings is greater than the space-savings from incoding them as references
	circularObjects // Enables circular object support. Note that this will store all objects as references, so don't enable it if you don't need it.
}
*/

// There's also scon.decodeAsync which allows you to asyncronously decode a scon object in chunks.
let firstChunk = await readDataBufferChunkSomehow();
let decoded = await scon.decodeAsync(firstChunk, {useMagicNumber: false}, (requestedLength) => {
	// This callback function gets passed how much data is requested in bytes
	// It must return a promise which resolves to a Buffer or Uint8Array
	// If the returned promise rejects, the scon.decodeAsync function will also reject with the same error
	return readDataBufferChunkSomehow();
});
decoded.result; // This contains your data
decoded.leftover; // This contains a Buffer or Uint8Array containing all the data which hasn't been read after the end of the SCON data.
*/
```

## A cool sidenote regarding circular objects
```js
// You really shouldn't have to know this, I'm just kinda proud of what I did here.
// Sometimes during the decoding process, a reference will point to an object which hasn't been decoded yet. This is true for circular objects. When this happens, the decode function's returned object will have what I like to call "quantum properties", where the value is completly unknown until observed.

// Consider the following object
let obj = {v:{}};
obj.v.v = obj.v;
util.inspect(decodedObj); // "{ v: { v: [Circular] } }";
// Now, run it through SCON
let decodedObj = scon.decode(scon.encode(obj,{circularObjects:true}));
util.inspect(decodedObj); // "{ v: { v: [Getter/Setter] } }";
// What's this? A Getter/Setter property? That wasn't in the original object!
// Here's the cool part, the act of reading to or writing the property will reveal its actual value;
util.inspect(decodedObj.v.v); // "{ v: [Circular] };
// Now if we inspect the whole object again...
util.inspect(decodedObj); // "{ v: { v: [Circular] } }";
// Neat, huh?
```

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style. Sometime in the future, I might add a linter to yell at you. (and me)
Add unit tests for any new or changed functionality. 100% code coverage, or bust.

## Release History
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

[npm-image]: https://nodei.co/npm/scon.png?downloads=true&downloadRank=true&stars=true
[npm-url]: https://nodei.co/npm/scon/

[node-version-image]: https://img.shields.io/node/v/scon.svg
[node-version-url]: https://nodejs.org/en/download/

[build-status-image]: https://travis-ci.org/BlueStone-Tech-Enterprises/scon.svg
[build-status-url]: https://travis-ci.org/BlueStone-Tech-Enterprises/scon

[license-image]: https://img.shields.io/npm/l/scon.svg?maxAge=2592000
[license-url]: LICENSE
