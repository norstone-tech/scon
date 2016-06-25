/**
 * Swift Binary Tag
 * https://github.com/JamesxX/scon
 *
 * Copyright (c) Aritz Beobide-Cardinal, 2016 James R Swift
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

var sconConf = {}

sconConf.magicNumber = "scon"
sconConf.bufferSize = 50 * 1024 // 50kb

sconConf.endBlock = 0;
sconConf.int32 = 1;
sconConf.float32 = 2;
sconConf.string = 3;
sconConf.compound = 4;
sconConf.array = 5; 
sconConf.null = 6;
sconConf.undefined = 7;
sconConf.boolean = 8;
sconConf.reserved = 255;

module.exports = sconConf;
