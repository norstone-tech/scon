/**
 * Swift-Cardinal Object Notation
 * https://github.com/BlueStone-Tech-Enterprises/scon/
 *
 * Copyright (c) BlueStone Technological Enterprises Inc., 2016-2017
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

const sconConf = {}

sconConf.magicNumberArr = new Uint8Array([7,83,67,50]);

let i = 0;
sconConf.endBlock = i++;

sconConf.header = i++; // Unused, reserved for future use
sconConf.compound = i++; // Nested objects
sconConf.circularCompund = i++; // Unused, reserved for future use
sconConf.circularCompundReference = i++; // Unused, reserved for future use
sconConf.reserved5 = i++;
sconConf.reserved6 = i++;
sconConf.reserved7 = i++;
sconConf.undefined = i++; //Only used in arrays. but this could also be used as a noop.
sconConf.null = i++;

sconConf.boolfalse = i++;
sconConf.booltrue = i++;
sconConf.boolean = i++; // For when you want to waste 7 whole bits on a boolean

// It takes up less space to store inf this way instead of as a float32. 1 byte instead of 5!
sconConf.nan = i++;
sconConf.floatInf = i++;
sconConf.floatNegInf = i++;
sconConf.float32 = i++;
sconConf.float64 = i++;

sconConf.uint0 = i++;
sconConf.uint8 = i++;
sconConf.uint16 = i++;
sconConf.uint24 = i++;
sconConf.uint32 = i++;
sconConf.uint40 = i++;
sconConf.uint48 = i++;
sconConf.uint56 = i++; //Higher than Number.MAX_SAFE_INTEGER, will be inaccurate.
sconConf.uint64 = i++; //Higher than Number.MAX_SAFE_INTEGER, will be inaccurate.

sconConf.int0 = i++;
sconConf.int8 = i++;
sconConf.int16 = i++;
sconConf.int24 = i++;
sconConf.int32 = i++;
sconConf.int40 = i++;
sconConf.int48 = i++;
sconConf.int56 = i++; //Higher than Number.MAX_SAFE_INTEGER, will be inaccurate.
sconConf.int64 = i++; //Higher than Number.MAX_SAFE_INTEGER, will be inaccurate.


// Unicode string
sconConf.utf8string0 = i++;
sconConf.utf8string8 = i++;
sconConf.utf8string16 = i++;
sconConf.utf8string24 = i++;
sconConf.utf8string32 = i++; //Maximum length in nodejs. All utf8string sizes above this are placeholders
sconConf.utf8string40 = i++;
sconConf.utf8string48 = i++;
sconConf.utf8string56 = i++;
sconConf.utf8string64 = i++;

sconConf.array0 = i++;
sconConf.array8 = i++;
sconConf.array16 = i++;
sconConf.array24 = i++;
sconConf.array32 = i++; //Maximum length in nodejs. All array sizes above this are placeholders
sconConf.array40 = i++;
sconConf.array48 = i++;
sconConf.array56 = i++;
sconConf.array64 = i++;

// byte array
sconConf.string0 = i++;
sconConf.string8 = i++;
sconConf.string16 = i++;
sconConf.string24 = i++;
sconConf.string32 = i++; //Maximum length in nodejs. All string sizes above this are placeholders
sconConf.string40 = i++;
sconConf.string48 = i++;
sconConf.string56 = i++;
sconConf.string64 = i++;

/*
sconConf.utf16string8 = 27;
sconConf.utf16string16 = 28;
sconConf.utf16string24 = 29;
sconConf.utf16string32 = 30; 
sconConf.utf16string40 = 31;
sconConf.utf16string48 = 32;
sconConf.utf16string56 = 33;
sconConf.utf16string64 = 34;
*/

sconConf.reserved = 255;

module.exports = sconConf;
