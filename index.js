/**
 * Swift Binary Tag
 * https://github.com/JamesxX/sbtag
 *
 * Copyright (c) 2016 James R Swift
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

var Buffer = require('buffer').Buffer;

var sbtag = {}
var sbtagUtil = require( "./lib/util.js" );

sbtagUtil.loadSubmodule( sbtag, "lib/conf.js" );
sbtagUtil.loadSubmodule( sbtag, "lib/error.js" );
sbtagUtil.loadSubmodule( sbtag, "lib/encode.js" );
sbtagUtil.loadSubmodule( sbtag, "lib/decode.js" );

module.exports = sbtag;