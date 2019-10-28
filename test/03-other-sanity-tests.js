
const {expect} = require('chai');
const scon = require('../index.js');
describe('Other sanity tests', function() {
	it("strips out stupid \"undefined\" values", function(){
		const object = {
			a: undefined
		}
		expect(
			// Using an array to test because they encode very predictibly
			scon.decode(scon.encode(object))
		).to.deep.equal({});
	});
});