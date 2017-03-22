/**
 * Swift-Cardinal Object Notation
 * https://github.com/BlueStone-Tech-Enterprises/scon/
 *
 * Copyright (c) Aritz Beobide-Cardinal, 2016 James R Swift
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

var scon = {};
var sconUtil = require( "./lib/util.js" );

sconUtil.loadSubmodule( scon, "lib/conf.js" );
sconUtil.loadSubmodule( scon, "lib/error.js" );
sconUtil.loadSubmodule( scon, "lib/encode.js" );
sconUtil.loadSubmodule( scon, "lib/decode.js" );

module.exports = scon;
