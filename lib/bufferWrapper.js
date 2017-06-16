/**
 * Swift-Cardinal Object Notation
 * https://github.com/BlueStone-Tech-Enterprises/scon/
 *
 * Copyright (c) BlueStone Technological Enterprises Inc., 2016-2017
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

const scon = {};
const sconUtil = require( "./util.js" );

if (typeof Buffer == "undefined"){
	scon.bufferFrom = function(obj){
		return new Uint8Array(obj);
	}
	scon.bufferAlloc = scon.bufferFrom;
	scon.bufferAllocFixedLen = scon.bufferAlloc;
	// uint array to string function written by AJ ONeal
	// From https://coolaj86.com/articles/unicode-string-to-a-utf-8-typed-array-buffer-in-javascript/
	// Modified to follow ES6 type conventions
	scon.bufferToString = function(ua){
		const binstr = Array.prototype.map.call(ua, function (ch) {
			return String.fromCharCode(ch);
		}).join('');
		const escstr = binstr.replace(/(.)/g, function (m, p) {
			let code = p.charCodeAt(0).toString(16).toUpperCase();
			if (code.length < 2) {
				code = '0' + code;
			}
			return '%' + code;
		});
		return decodeURIComponent(escstr); //FIX ME: Complains when UTF8 text is "malformed"
	}

	// string to uint array function written by AJ ONeal
	// From https://coolaj86.com/articles/unicode-string-to-a-utf-8-typed-array-buffer-in-javascript/
	// Modified to follow ES6 type conventions
	scon.stringToBuffer = function(s){
		const escstr = encodeURIComponent(s);
		const binstr = escstr.replace(/%([0-9A-F]{2})/g, function(match, p1) {
			return String.fromCharCode('0x' + p1);
		});
		const ua = scon.bufferAlloc(binstr.length);
		Array.prototype.forEach.call(binstr, function (ch, i) {
			ua[i] = ch.charCodeAt(0);
		});
		return ua;
	}

}else{
	console.log("using Buffers")
	scon.bufferFrom = function(obj){
		return Buffer.from(obj);
	}
	scon.bufferAlloc = function(obj){
		return Buffer.allocUnsafe(obj);
	}
	scon.bufferAllocFixedLen = function(obj){
		return Buffer.allocUnsafeSlow(obj);
	}
	scon.bufferToString = function(ua){
		return ua.toString("utf8");
	}
	scon.stringToBuffer = function(s){
		return Buffer.from(s,"utf8");
	}
}

module.exports = scon;