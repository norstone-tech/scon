/**
 * Swift Binary Tag
 * https://github.com/JamesxX/sbtag
 *
 * Copyright (c) 2016 James R Swift
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

var sbtagUtil = {}

sbtagUtil.mergeRecursive = function (obj1, obj2) {
	
	for (var p in obj2) {
		try {
			// Property in destination object set; update its value.
			if ( obj2[p].constructor==Object ) {
				
				obj1[p] = sbtagUtil.mergeRecursive({}, obj2[p]);
			
			} else {
				
				obj1[p] = obj2[p];
				
			}
		
		} catch(e) {
			// Property in destination object not set; create it and set its value.
			obj1[p] = obj2[p];
		
		}
	}
	
	return obj1;
}

sbtagUtil.loadSubmodule = function ( sbtagObject, moduleName ){
	
	var submodule = require( "../" + moduleName );
	sbtagUtil.mergeRecursive( sbtagObject, submodule );
	
}

module.exports = sbtagUtil