/**
 * Swift-Cardinal Object Notation
 * https://github.com/norstone-tech/scon
 *
 * Copyright (c) BlueStone Technological Enterprises Inc., 2016-2019
 * Copyright (c) Norstone Technologies 2021
 * Licensed under the GNU GPLv3 license.
 */

"use strict";
module.exports = {
	...require("./lib/conf"),
	...require("./lib/error"),
	...require("./lib/decode"),
	...require("./lib/encode"),
	...require("./lib/encode-fast")
};
