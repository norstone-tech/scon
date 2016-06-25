var expect = require('chai').expect;
var sbtag = require('../index.js');

describe("Swift Binary Tag file format", function() {
	
	it("should write the magic number", function(){
		expect(sbtag.encode( {} ).result.substring( 0, sbtag.magicNumber.length ) ).to.equal( sbtag.magicNumber );
	})
	
});