var expect = require('chai').expect;
var scon = require('../index.js');

function testKeyValueEquality( key, obj1, obj2 ){
	
	if ( typeof obj1[ key ] == "object" ){
		
		describe( "Testing member object '" + key + "'", function(){
			
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
		string8: "world!!",
		string16: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam aliquam ante nec sem venenatis, vitae vehicula arcu malesuada. Ut eleifend tempus urna sed eleifend. Donec volutpat tristique condimentum. Ut et pharetra erat, quis elementum nulla. Nam eu elit vulputate ante ullamcorper dictum ac vel nunc. Sed cursus ornare odio vel vestibulum. Morbi sollicitudin maximus neque, ac sagittis odio laoreet non. Aliquam pretium, magna non porttitor molestie, ante sapien blandit magna, ut cursus nullam. ",
		NotANumber: NaN,
		pi: 3.14159,
		object: {
			bool:true,
			['true']: {
				nested:"objects"
			}
		},
		six: 6,
		uint16: 1337,
		int16: -1337,
		array8: ["wan","too","free",{"for":4},[1,2,3,4,5]]
	};
	testCase["array16"] = [];
	for (var i=0;i<300;i+=1){
		testCase["array16"][i] = ["val"+i];
	}
	
	it( "should not throw errors when encoding", function(){
		expect( function(){scon.encode( testCase )} ).to.not.throw( scon.Exception );
	});
	
	var encoded = scon.encode( testCase );
	
	it("should write the magic number", function(){
		expect( encoded.result.substring( 0, scon.magicNumber.length ) ).to.equal( scon.magicNumber );
	});
	
	it( "should not throw errors when decoding", function(){
		expect( function(){scon.decode( encoded.result )} ).to.not.throw( scon.Exception );
	});
	
	var decoded = scon.decode( encoded.result );
	
	describe( "testing equality of testCase and decoded object", function(){
		
		for (var key in testCase) {
			
			testKeyValueEquality( key, testCase, decoded.result );
			
		}
		
	});
	
});

