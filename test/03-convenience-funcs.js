const {expect} = require('chai')
const {encode, BASE_TYPES} = require("../");
describe("convenience functions", function(){
	describe("encode", function(){
		it("works", function(){
			expect(
				encode({})
			).to.deep.equal(Buffer.from([
				0x07, // Ding!
				0x53, // S
				0x43, // C
				0x33, // 3
				BASE_TYPES.OBJECT, // Start of root value object
				0x00 // End of Object
			]));
	})
	});
});
