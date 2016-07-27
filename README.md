Swift-Cardinal Object Notation (SCON)
=========

A minimal node module allowing the reading and writing of data in the SCON format.
The SCON format, created by Aritz J Beobide-Cardinal (ARitz Cracker) and James R Swift, is an extendable binary file format that was created to store data more efficiently than the popular JSON standard.

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Node.js Version][node-version-image]][node-version-url]
[![Build status][build-status-image]][build-status-url]
[![License][license-image]][license-url]

## Installation

```shell
npm install scon --save
```

## Usage

```js
var scon = require('scon');

var encoded = scon.encode( { hello: "world!", five: 5 } ).result;
var decoded = scon.decode( encoded ).result;
```

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style.
Add unit tests for any new or changed functionality. Lint and test your code.

## Release History

* 1.1.0 Ints now take up less bytes depending on how big they are. Also, bugfixes.
* 1.0.3 Added TravisCI intergration and tests
* 1.0.2 Added support for NaN and 64 bit floats
* 1.0.0 Added support for arrays, booleans, and nulls!
* 0.9.2 ???
* 0.9.0 Major update in module structure, and added error handling.
* 0.8.2 Removed left over tests.
* 0.8.0 Initial release

[npm-image]: https://img.shields.io/npm/v/scon.svg
[npm-url]: https://npmjs.org/package/scon

[downloads-image]: https://img.shields.io/npm/dm/scon.svg
[downloads-url]: https://npmjs.org/package/scon

[node-version-image]: https://img.shields.io/node/v/scon.svg
[node-version-url]: https://nodejs.org/en/download/

[build-status-image]: https://travis-ci.org/JamesxX/scon.svg
[build-status-url]: https://travis-ci.org/JamesxX/scon

[license-image]: https://img.shields.io/npm/l/scon.svg?maxAge=2592000
[license-url]: LICENSE
