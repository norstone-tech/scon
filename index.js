/**
 * Swift Binary Tag
 * https://github.com/JamesxX/scon
 *
 * Copyright (c) Aritz Beobide-Cardinal, 2016 James R Swift
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

var Buffer = require('buffer').Buffer;

var scon = {}
var sconUtil = require( "./lib/util.js" );

sconUtil.loadSubmodule( scon, "lib/conf.js" );
sconUtil.loadSubmodule( scon, "lib/error.js" );
sconUtil.loadSubmodule( scon, "lib/encode.js" );
sconUtil.loadSubmodule( scon, "lib/decode.js" );

if ( true ){
	var encoded = scon.encode( { hello: "world!!", hi: "bye", five: 5, pi: 3.14159, object:{amazing:true,true:{"mind":"fuck"}}, six: 6 ,arr:["wan","too","free",{"for":4},[1,2,3,4,5]]});
	console.log( "encoded:", encoded );

	var decoded = scon.decode( encoded.result );
	console.log( "decoded:", JSON.stringify(decoded));	
}

module.exports = scon;
