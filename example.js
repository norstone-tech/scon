/**
 * Swift-Cardinal Object Notation
 * https://github.com/BlueStone-Tech-Enterprises/scon/
 *
 * Copyright (c) Aritz Beobide-Cardinal, 2016 James R Swift
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

var scon = require( "./index.js" );

var encoded = scon.encode( { hello: "world!!", hi: "bye", five: NaN, pi: 3.14159, object:{amazing:true,true:{"mind":"fuck"}}, six: 6 ,arr:["wan","too","free",{"for":4},[1,2,3,4,5]]});
console.log( "encoded:", encoded );

var decoded = scon.decode( encoded.result );
console.log( "decoded:", decoded.result);
