Swift-Cardinal Object Notation (SCON)
=========

A minimal node module allowing the reading and writing of data in the SCON format.
The SCON format, created by Aritz J Beobide-Cardinal (ARitz Cracker) and James R Swift, is an extendable binary file format that was created to store data more efficiantly than the popular JSON standard.

Get the module here [![npm version](https://badge.fury.io/js/sbtag.svg)](https://badge.fury.io/js/sbtag)

## Installation

```shell
npm install sbtag --save
```

## Usage

```js
var sbtag = require('sbtag');

var encoded = sbtag.encode( { hello: "world!", five: 5 } ).result;
var decoded = sbtag.decode( encoded ).result;
```

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style.
Add unit tests for any new or changed functionality. Lint and test your code.

## Release History

* 1.0.0 Added support for arrays, booleans, and nulls!
* 0.9.2 ???
* 0.9.0 Major update in module structure, and added error handling.
* 0.8.2 Removed left over tests.
* 0.8.0 Initial release
