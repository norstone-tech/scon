Swift-Cardinal Object Notation (SCON)
=========

[![NPM][npm-image]][npm-url]

[![Node.js Version][node-version-image]][node-version-url]
[![Build status][build-status-image]][build-status-url]
[![License][license-image]][license-url]

A minimal node module allowing the reading and writing of data in the SCON format.
The SCON format, created by Aritz J Beobide-Cardinal (ARitz Cracker) and James R Swift, is an extendable binary file format that was created to store data more efficiently than the popular JSON standard.

## Installation

```shell
npm install scon --save
```

## Usage

```js
var useMagicNumber = true; //If useMagicNumber is undefined or null, it will default to true;
var scon = require( 'scon', useMagicNumber );

// If you wish to encode binary data, use NodeJS Buffers or Uint8Arrays
var encoded = scon.encode( { hello: "world!", five: 5 } );
// encoded will be a Buffer or Uint8Array depending on the platform you're using it on.

var decoded = scon.decode( encoded, useMagicNumber );


// SCON also now supports "Stream decoding". These are intended for use where you get a stream of never-ending scon data.
// scon.streamDecode returns a function which expects a chunk of data (Uint8Array, Buffer, or String with characters no higher than 255)
// For example:
readableStream.on('data', scon.streamDecode(function(decoded){
	console.log("The object decoded was:",decoded);
},useMagicNumber));
// It is important to note if the chunk contains multiple complete SCONs, the callback will be called IN SYNC, this is to make sure that the entire chunk is read before the next one arrives.

```

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style.
Add unit tests for any new or changed functionality. Lint and test your code.

## Release History
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
