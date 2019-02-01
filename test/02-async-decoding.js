const chai = require('chai');
const scon = require('../index.js');
const {randomBytes} = require("crypto");
const noMagicNumber = {useMagicNumber:false};

chai.use(require("chai-as-promised"));
const expect = chai.expect;

describe("SCON Async Decoder", function() {
    it("works when given all data", function(){
		return Promise.all([
			expect(
				scon.decodeAsync(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x32, // 2
					0x00 // End of Object
				]))
			).to.eventually.deep.equal({
				result: {},
				leftover: Buffer.alloc(0)
			}),
			expect(
				scon.decodeAsync(Buffer.from([
					0x00 // End of Object
				]), noMagicNumber)
			).to.eventually.deep.equal({
				result: {},
				leftover: Buffer.alloc(0)
			}),
			expect(
				scon.decodeAsync(Buffer.from([
					0x07, // Ding!
					0x53, // S
					0x43, // C
					0x32, // 2
					0x00 // End of Object
				]), true)
			).to.eventually.deep.equal({
				result: {},
				leftover: Buffer.alloc(0)
			}),
			expect(
				scon.decodeAsync(Buffer.from([
					0x00 // End of Object
				]), false)
			).to.eventually.deep.equal({
				result: {},
				leftover: Buffer.alloc(0)
			})
		]);
    });
    it("returns any leftovers", function(){
        return expect(
            scon.decodeAsync(Buffer.from([
                0x00, // End of Object
                0xff,
                0xff
            ]), false)
        ).to.eventually.deep.equal({
            result: {},
            leftover: Buffer.alloc(2, 0xff)
        });
    });
    it("works when given chunks of data", function(){
        const testObject = {ayy:"lmao"};
        const testData = scon.encode(testObject, noMagicNumber);
		let i = 2;
		const testData1 = Buffer.from([
			0x07, // Ding!
			0x53, // S
			0x43, // C
			0x32, // 2
		]);
		const testData2 = Buffer.from([
			0x00 // End of Object
		]);
		return Promise.all([
			expect(
				scon.decodeAsync(testData.subarray(0,2), noMagicNumber, (lenRequested) => {
					return Promise.resolve(testData.subarray(i, i+=2));
				})
			).to.eventually.deep.equal({
				result: testObject,
				leftover: Buffer.alloc(0)
			}),
			expect(
				scon.decodeAsync(testData1, true, async(len) => {
					if (len === 1){
						return testData2;
					}else{
						throw new Error("Length is wrong!")
					}
				})
			).to.eventually.deep.equal({
				result: {},
				leftover: Buffer.alloc(0)
			})
		]);
    });
    it("re-throws the error given in the \"request data\" callback", function(){
        // In my quest for 100% code coverage, I have to do this _every place where the throw could take place!!_
        return Promise.all([
            expect(
                scon.decodeAsync(Buffer.alloc(0), noMagicNumber, (lenRequested) => {
                    return Promise.reject(new Error("Nothing for you!!"));
                })
            ).to.eventually.be.rejectedWith("Nothing for you!!"),
            expect(
                scon.decodeAsync(Buffer.from([0x02]), noMagicNumber, (lenRequested) => {
                    return Promise.reject(new Error("Nothing for you!!"));
                })
			).to.eventually.be.rejectedWith("Nothing for you!!"),
			expect(
				scon.decodeAsync(Buffer.from([
					0x10 | 0x80, // type=float64 with "Short key name length" modifier
					1, // "v" has 1 char
					0x76, // "v"
				]), noMagicNumber, (lenRequested) => {
					return Promise.reject(new Error("Nothing for you!!"));
				})
			).to.eventually.be.rejectedWith("Nothing for you!!"),
			expect(
				scon.decodeAsync(Buffer.from([
					0x05, // type=referencedValue
				]), noMagicNumber, (lenRequested) => {
					return Promise.reject(new Error("Nothing for you!!"));
				})
			).to.eventually.be.rejectedWith("Nothing for you!!"),
			expect(
				scon.decodeAsync(Buffer.from([
					0x05, // type=referencedValue
					0x02, // type=compund 
				]), noMagicNumber, (lenRequested) => {
					return Promise.reject(new Error("Nothing for you!!"));
				})
			).to.eventually.be.rejectedWith("Nothing for you!!"),
			expect(
				scon.decodeAsync(Buffer.from([
					0x04 | 0x80, // type=referencedKey with "Short key name length" modifier
				]), noMagicNumber, (lenRequested) => {
					return Promise.reject(new Error("Nothing for you!!"));
				})
			).to.eventually.be.rejectedWith("Nothing for you!!"),
			expect(
				scon.decodeAsync(Buffer.from([
					0x27 | 0x80, // type=utf8String24 
					1, // "v" has 1 char
				]), noMagicNumber, (lenRequested) => {
					return Promise.reject(new Error("Nothing for you!!"));
				})
			).to.eventually.be.rejectedWith("Nothing for you!!"),
			expect(
				scon.decodeAsync(Buffer.from([
					0x27 | 0x80, // type=utf8String24 
					1, // "v" has 1 char
					0x76, // "v"
					1048576 >>> 16,
					1048576 >>> 8,
					1048576
				]), noMagicNumber, (lenRequested) => {
					return Promise.reject(new Error("Nothing for you!!"));
				})
			).to.eventually.be.rejectedWith("Nothing for you!!"),
			expect(
				scon.decodeAsync(Buffer.from([
					0x27 | 0x80, // type=utf8String24 
					1, // "v" has 1 char
					0x76, // "v"
					1048576 >>> 16
				]), noMagicNumber, (lenRequested) => {
					return Promise.reject(new Error("Nothing for you!!"));
				})
			).to.eventually.be.rejectedWith("Nothing for you!!"),
			expect(
				scon.decodeAsync(Buffer.from([
					0x27 | 0x80, // type=utf8String24 
					1, // "v" has 1 char
					0x76, // "v"
					1048576 >>> 16,
					1048576 >>> 8,
					1048576,
					0x76, // "v"
					0x76, // "v"
					0x76 // "v"
				]), noMagicNumber, (lenRequested) => {
					return Promise.reject(new Error("Nothing for you!!"));
				})
			).to.eventually.be.rejectedWith("Nothing for you!!"),
			expect(
				scon.decodeAsync(Buffer.from([
					0x37 | 0x80, // type=string8
					1, // "v" has 1 char
					0x76, // "v"
					255,
					0x76, // "v"
					0x76, // "v"
					0x76 // "v"
				]), noMagicNumber, (lenRequested) => {
					return Promise.reject(new Error("Nothing for you!!"));
				})
			).to.eventually.be.rejectedWith("Nothing for you!!"),
			expect(
				scon.decodeAsync(Buffer.from([
					0x11 | 0x80, // type=float64 with "Short key name length" modifier
					1, // "v" has 1 char
					0x76, // "v"
					0x40, //
				]), noMagicNumber, (lenRequested) => {
					return Promise.reject(new Error("Nothing for you!!"));
				})
			).to.eventually.be.rejectedWith("Nothing for you!!"),
			expect(
				scon.decodeAsync(Buffer.from([
					0x10 | 0x80, // type=float64 with "Short key name length" modifier
					1, // "v" has 1 char
					0x76, // "v"
					0x40, //
				]), noMagicNumber, (lenRequested) => {
					return Promise.reject(new Error("Nothing for you!!"));
				})
			).to.eventually.be.rejectedWith("Nothing for you!!"),
			expect(
				scon.decodeAsync(Buffer.from([
					0x0c | 0x80, // type=boolean with "Short key name length" modifier
					1, // "v" has 1 char
					0x76 // "v"
				]), noMagicNumber, (lenRequested) => {
					return Promise.reject(new Error("Nothing for you!!"));
				})
			).to.eventually.be.rejectedWith("Nothing for you!!"),
			expect(
				scon.decodeAsync(Buffer.from([
					0x2e | 0x80, // type=array8 with "Short key name length" modifier
					1, // "v" has 1 char
					0x76, // "v"
					0x01
				]), noMagicNumber, (lenRequested) => {
					return Promise.reject(new Error("Nothing for you!!"));
				})
			).to.eventually.be.rejectedWith("Nothing for you!!"),
			expect(
				scon.decodeAsync(Buffer.from([
					0x2e | 0x80, // type=array8 with "Short key name length" modifier
					1, // "v" has 1 char
					0x76, // "v"
					0x01,
					0x2e // type=array8
				]), noMagicNumber, (lenRequested) => {
					return Promise.reject(new Error("Nothing for you!!"));
				})
			).to.eventually.be.rejectedWith("Nothing for you!!"),
        ]);
    })
});