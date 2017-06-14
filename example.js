/**
 * Swift-Cardinal Object Notation
 * https://github.com/BlueStone-Tech-Enterprises/scon/
 *
 * Copyright (c) BlueStone Technological Enterprises Inc., 2016-2017
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

var charCodeSymbols = [
"NUL",
"SOH",
"STX",
"ETX",
"EOT",
"ENQ",
"ACK",
"BEL",
"BS",
"TAB",
"LF",
"VT",
"FF",
"CR",
"SO",
"SI",
"DLE",
"DC1",
"DC2",
"DC3",
"DC4",
"NAK",
"SYN",
"ETB",
"CAN",
"EM",
"SUB",
"ESC",
"FS",
"GS",
"RS",
"US",
"space"
];
var debugArr = function(arr){
	console.log("Stuff:")
	for(let i=0;i<arr.length;i+=1){
		console.log(i+": "+arr[i]+" "+(charCodeSymbols[arr[i]] || String.fromCharCode(arr[i])))
	}
}



var scon = require( "./index.js" );

var encoded = scon.encode( { testInt:8 ,hello: "world!!", hi: "bye", five: NaN, pi: 3.14159, object:{amazing:true,true:{"mind":"fuck"}}, six: 6 ,arr:["wan","too","free",{"for":4},[1,2,3,4,5]]});
console.log( "encoded:" );
debugArr(encoded)

var decoded = scon.decode( encoded );
console.log( "decoded:", decoded);
