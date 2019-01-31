const {expect} = require('chai');
const scon = require('../index.js');
const {randomBytes} = require("crypto");
// If the encoder tests passed, we can trust it
describe("SCON Decoder", function() {
    it("Checks for the magic number by default", function(){
        const testObject = {};
        expect(
            scon.decode(
                scon.encode({}, {useMagicNumber:true})
            )
        ).to.deep.equal(testObject);
        expect(
            scon.decode(
                scon.encode({}, {useMagicNumber:true})
            ,{})
        ).to.deep.equal(testObject);
        expect(()=>{
            scon.decode(
                scon.encode({"aaaaaa":"aaaaaa"}, {useMagicNumber:false})
            )
        }).to.throw(scon.Error);
        expect(()=>{
            scon.decode(
                scon.encode({}, {useMagicNumber:false})
            )
        }).to.throw(scon.Error);
    });
    it("Doesn't check for magic numbers when it's told to", function(){
        const testObject = {};
        expect(
            scon.decode(
                scon.encode({}, {useMagicNumber:true})
            ,{useMagicNumber:true})
        ).to.deep.equal(testObject);
        expect(
            scon.decode(
                scon.encode({}, {useMagicNumber:false})
            ,{useMagicNumber:false})
        ).to.deep.equal(testObject);
        expect(
            scon.decode(
                scon.encode({}, {useMagicNumber:true})
            ,true)
        ).to.deep.equal(testObject);
        expect(
            scon.decode(
                scon.encode({}, {useMagicNumber:false})
            ,false)
        ).to.deep.equal(testObject);
    });
});