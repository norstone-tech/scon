/**
 * Swift-Cardinal Object Notation
 * https://github.com/JamesxX/scon
 *
 * Copyright (c) Aritz Beobide-Cardinal, 2016 James R Swift
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

var scon = {};
var sconUtil = require( "./util.js" );
//http://stackoverflow.com/questions/14071463/how-can-i-merge-typedarrays-in-javascript#14071518
sconUtil.loadSubmodule( scon, "lib/conf.js" );
sconUtil.loadSubmodule( scon, "lib/error.js" );

// string to uint array function written by AJ ONeal
// From https://coolaj86.com/articles/unicode-string-to-a-utf-8-typed-array-buffer-in-javascript/
var unicodeStringToTypedArray = function(s) {
    var escstr = encodeURIComponent(s);
    var binstr = escstr.replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
    });
    var ua = new Uint8Array(binstr.length);
    Array.prototype.forEach.call(binstr, function (ch, i) {
        ua[i] = ch.charCodeAt(0);
    });
    return ua;
}




scon.encode = function(object,buff){
	
}
module.exports = scon;
