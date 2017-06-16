/**
 * Swift-Cardinal Object Notation
 * https://github.com/BlueStone-Tech-Enterprises/scon/
 *
 * Copyright (c) BlueStone Technological Enterprises Inc., 2016-2017
 * Licensed under the GNU GPLv3 license.
 */
"use strict"
 
const expect = require('chai').expect;
const scon = require('../index.js');
const fs = require("fs");

function testKeyValueEquality( key, obj1, obj2 ){
	
	it( "Key " + key + " should be the same type", function(){
		expect( typeof obj1[ key ] ).to.equal( typeof obj2[ key ] );
	});
	
	if ( typeof obj1[ key ] == "object" ){
		
		describe( "Testing member object '" + key + "'", function(){
			if (obj1[ key ] instanceof Array || obj1[ key ] instanceof Uint8Array){
				for (let subkey=0;subkey<obj1[key].length;subkey+=1){
					testKeyValueEquality( subkey, obj1[key], obj2[key] );
				}
			}else{
				for (let subkey in obj1[key]) {
					testKeyValueEquality( subkey, obj1[key], obj2[key] );
				}
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
	
	
	const testCase = {
		binData: Buffer.from([13,37,76,132,23,12]),
		string8: "Hello, world!!",
		string16: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam aliquam ante nec sem venenatis, vitae vehicula arcu malesuada. Ut eleifend tempus urna sed eleifend. Donec volutpat tristique condimentum. Ut et pharetra erat, quis elementum nulla. Nam eu elit vulputate ante ullamcorper dictum ac vel nunc. Sed cursus ornare odio vel vestibulum. Morbi sollicitudin maximus neque, ac sagittis odio laoreet non. Aliquam pretium, magna non porttitor molestie, ante sapien blandit magna, ut cursus nullam.",
		NotANumber: NaN,
		inf:Number.POSITIVE_INFINITY,
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
		array8: ["wan","too","free",{"for":4},[1,2,3,4,5]], 
		"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam aliquam ante nec sem venenatis, vitae vehicula arcu malesuada. Ut eleifend tempus urna sed eleifend. Donec volutpat tristique condimentum. Ut et pharetra erat, quis elementum nulla. Nam eu elit vulputate ante ullamcorper dictum ac vel nunc. Sed cursus ornare odio vel vestibulum. Morbi sollicitudin maximus neque, ac sagittis odio laoreet non. Aliquam pretium, magna non porttitor molestie, ante sapien blandit magna, ut cursus nullam.":"This is a really long string, ain't it?",
	};
	testCase["array16"] = [];
	for (let i=0;i<300;i+=1){
		testCase["array16"][i] = ["val"+i];
	}
	
	it( "should not throw errors when encoding", function(){
		expect( function(){scon.encode( testCase )} ).to.not.throw( Error );
	});
	
	const encoded = scon.encode( testCase );
	
	
	/*
	it("should write the magic number", function(){
		expect( encoded.substring( 0, scon.magicNumber.length ) ).to.equal( scon.magicNumber );
	});
	*/
	
	
	
	it( "should not throw errors when decoding", function(){
		expect( function(){scon.decode( encoded )} ).to.not.throw( Error );
	});
	
	
	
	
	const decoded = scon.decode( encoded );
	
	describe( "testing equality of testCase and decoded object", function(){
		
		for (let key in testCase) {
			
			testKeyValueEquality( key, testCase, decoded );
			
		}
		
	});
	
	
	
	const firstTest = fs.readFileSync("test/test1.scon");
	it( "should not throw errors when decoding a NodeJS Buffer", function(){
		expect( function(){scon.decode( firstTest )} ).to.not.throw( Error );
	});
	it( "should decode a NodeJS buffer correctly", function(){
		let decoded = scon.decode(firstTest);
		expect( decoded.hello ).to.equal( "world!" );
	});
		
	it( "should decode all complete scons in a chunk", function(){
		const secondTest = fs.readFileSync("test/test2.scon");
		let count = 0;
		scon.streamDecode(function(obj){
			count+=1;
			console.log("completed multiscon #"+count);
		})(secondTest);
		expect(count).to.equal( 5 );
	});
	
	
	it( "should decode a stream of chunks", function(){
		const firstChunk = fs.readFileSync("test/test3-1.scon");
		const secondChunk = fs.readFileSync("test/test3-2.scon");
		let count = 0;
		const decodeFunc = scon.streamDecode(function(obj){
			count+=1;
		});
		decodeFunc(firstChunk);
		decodeFunc(secondChunk);
		expect(count).to.equal( 1 );
	});
		
});

