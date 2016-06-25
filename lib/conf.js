/**
 * Swift Binary Tag
 * https://github.com/JamesxX/sbtag
 *
 * Copyright (c) Aritz Beobide-Cardinal, 2016 James R Swift
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

var sbtagConf = {}

sbtagConf.magicNumber = "sbtag"
sbtagConf.bufferSize = 50 * 1024 // 50kb

sbtagConf.endBlock = 0;
sbtagConf.int32 = 1;
sbtagConf.float32 = 2;
sbtagConf.string = 3;
sbtagConf.compound = 4;
sbtagConf.array = 5; 
sbtagConf.null = 6;
sbtagConf.undefined = 7;
sbtagConf.boolean = 8;
sbtagConf.reserved = 255;

module.exports = sbtagConf;
