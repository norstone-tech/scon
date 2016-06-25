/**
 * Swift Binary Tag
 * https://github.com/JamesxX/sbtag
 *
 * Copyright (c) Aritz Beobide-Cardinal, 2016 James R Swift
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

if ( true ){
	var encoded = sbtag.encode( { hello: "world!!", hi: "bye", five: 5, pi: 3.14159, object:{amazing:true,true:{"mind":"fuck"}}, six: 6 ,arr:["wan","too","free",{"for":4},[1,2,3,4,5]]});
	console.log( "encoded:", encoded );

	var decoded = sbtag.decode( encoded.result );
	console.log( "decoded:", JSON.stringify(decoded));	
}

module.exports = sbtag;
