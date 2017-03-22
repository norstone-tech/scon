/**
 * Swift-Cardinal Object Notation
 * https://github.com/BlueStone-Tech-Enterprises/scon/
 *
 * Copyright (c) Aritz Beobide-Cardinal, 2016 James R Swift
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

var sconUtil = {};

sconUtil.mergeRecursive = function (obj1, obj2) {
	
	for (var p in obj2) {
		try {
			// Property in destination object set; update its value.
			if ( obj2[p].constructor==Object ) {
				
				obj1[p] = sconUtil.mergeRecursive({}, obj2[p]);
			
			} else {
				
				obj1[p] = obj2[p];
				
			}
		
		} catch(e) {
			// Property in destination object not set; create it and set its value.
			obj1[p] = obj2[p];
		
		}
	}
	
	return obj1;
};

sconUtil.loadSubmodule = function ( sconObject, moduleName ){
	
	var submodule = require( "../" + moduleName );
	sconUtil.mergeRecursive( sconObject, submodule );
	
};

module.exports = sconUtil;
