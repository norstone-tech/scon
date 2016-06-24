Swift Binary Tag (sbtag)
=========

A minimal node module allowing the reading and writing of data in the sbtag format.
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

* 1.0.2 Removed left over tests.
* 1.0.0 Initial release
