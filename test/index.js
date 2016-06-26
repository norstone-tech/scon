var expect = require('chai').expect;
var scon = require('../index.js');

describe("Swift-Cardinal Object Notation file format", function() {
	
	it("should write the magic number", function(){
		expect(scon.encode( {} ).result.substring( 0, scon.magicNumber.length ) ).to.equal( scon.magicNumber );
	})
	
});
