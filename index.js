/**
 * Swift-Cardinal Object Notation
 * https://github.com/BlueStone-Tech-Enterprises/scon/
 *
 * Copyright (c) BlueStone Technological Enterprises Inc., 2016-2017
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

const scon = {};
const sconUtil = require( "./lib/util.js" );

sconUtil.loadSubmodule( scon, "lib/conf.js" );
sconUtil.loadSubmodule( scon, "lib/error.js" );
sconUtil.loadSubmodule( scon, "lib/encode.js" );
sconUtil.loadSubmodule( scon, "lib/decode.js" );

module.exports = scon;
