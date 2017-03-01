/**
 * Swift-Cardinal Object Notation
 * https://github.com/JamesxX/scon
 *
 * Copyright (c) Aritz Beobide-Cardinal, 2016 James R Swift
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

var sconConf = {}

sconConf.magicNumberOld = "scon";
sconConf.magicNumber = String.fromCharCode(7,83,67,79,78,7);
sconConf.magicNumberArr = [7,83,67,79,78,7];
sconConf.bufferSize = 50 * 1024; // 50kb

sconConf.endBlock = 0;

sconConf.int32old = 1; //Legacy - same as int32
sconConf.float64old = 2; //Legacy - same as float64
sconConf.stringold = 3; //Legacy - same as string32

sconConf.compound = 4;

sconConf.arrayold = 5; //Legacy - Same as array32

sconConf.null = 6;
sconConf.undefined = 7; //Only used in arrays. but this could also be used as a noop.
sconConf.boolean = 8;
sconConf.nan = 9;

sconConf.uint8 = 10;
sconConf.uint16 = 11;
sconConf.uint24 = 11;
sconConf.uint32 = 12;
sconConf.uint40 = 13; //Unavaible since non-nodejs implimentation
sconConf.uint48 = 14; //Unavaible since non-nodejs implimentation
sconConf.uint56 = 15; //Higher than Number.MAX_SAFE_INTEGER
sconConf.uint64 = 16; //Higher than Number.MAX_SAFE_INTEGER

sconConf.int8 = 17;
sconConf.int16 = 18;
sconConf.int24 = 19;
sconConf.int32 = 20;
sconConf.int40 = 21; //Unavaible since non-nodejs implimentation
sconConf.int48 = 22; //Unavaible since non-nodejs implimentation
sconConf.int56 = 23; //Higher than Number.MAX_SAFE_INTEGER
sconConf.int64 = 24; //Higher than Number.MAX_SAFE_INTEGER

sconConf.float32 = 25;
sconConf.float64 = 26;

// Binary data
sconConf.string8 = 27;
sconConf.string16 = 28;
sconConf.string24 = 29;
sconConf.string32 = 30; //Maximum length in nodejs. All string sizes above this are placeholders
sconConf.string40 = 31;
sconConf.string48 = 32;
sconConf.string56 = 33;
sconConf.string64 = 34;

sconConf.array8 = 35;
sconConf.array16 = 36;
sconConf.array24 = 37;
sconConf.array32 = 38; //Maximum length in nodejs. All array sizes above this are placeholders
sconConf.array40 = 39;
sconConf.array48 = 40;
sconConf.array56 = 41;
sconConf.array64 = 42;

// Unicode string
sconConf.utf8string8 = 43;
sconConf.utf8string16 = 44;
sconConf.utf8string24 = 45;
sconConf.utf8string32 = 46; //Maximum length in nodejs. All string sizes above this are placeholders
sconConf.utf8string40 = 47;
sconConf.utf8string48 = 48;
sconConf.utf8string56 = 49;
sconConf.utf8string64 = 50;
/*
sconConf.utf16string8 = 27;
sconConf.utf16string16 = 28;
sconConf.utf16string24 = 29;
sconConf.utf16string32 = 30; //Maximum length in nodejs. All string sizes above this are placeholders
sconConf.utf16string40 = 31;
sconConf.utf16string48 = 32;
sconConf.utf16string56 = 33;
sconConf.utf16string64 = 34;
*/
//JS automatically does LE

sconConf.reserved = 255;

module.exports = sconConf;
