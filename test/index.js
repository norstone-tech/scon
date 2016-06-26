var expect = require('chai').expect;
var scon = require('../index.js');

function testKeyValueEquality( key, obj1, obj2 ){
	
	if ( typeof obj1[ key ] == "object" ){
		
		describe( "Teting member object '" + key + "'", function(){
			
			for (var subkey in obj1[key]) {
				testKeyValueEquality( subkey, obj1[key], obj2[key] );
			}
			
		});
		
	} else if  ( typeof obj1[ key ] == "number" && isNaN( obj1[ key ] ) ) {
		
		it( "Key " + key + " should have the same value in both objects (NaN)", function(){
			expect( obj2[ key ] ).to.be.NaN;
		});
		
	}else {
		
		it( "Key " + key + " should have the same value in both objects", function(){
			expect( obj1[ key ] ).to.equal( obj2[ key ] );
		});
		
	}
	
}

describe("Swift-Cardinal Object Notation file format", function() {
	
	var testCase = {
		hello: "world!!",
		hi: "bye",
		five: NaN,
		pi: 3.14159,
		object: {
			amazing:true,
			['true']: {
				mind:"fuck"
			}
		},
		six: 6,
		arr: ["wan","too","free",{"for":4},[1,2,3,4,5]]
	};
	
	var encoded = scon.encode( testCase );
	var decoded = scon.decode( encoded.result );
	
	it("should write the magic number", function(){
		expect( encoded.result.substring( 0, scon.magicNumber.length ) ).to.equal( scon.magicNumber );
	});
	
	describe( "testing equality of testCase and decoded object", function(){
		
		for (var key in testCase) {
			
			testKeyValueEquality( key, testCase, decoded.result );
			
		}
		
	});
	
});

