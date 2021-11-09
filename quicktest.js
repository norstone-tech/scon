// eslint-disable-next-line node/no-unpublished-require
const Benchmark = require("benchmark");
const suite = new Benchmark.Suite("SCON/JSON comparison");
const {SconEncoder, SconDecoder} = require("./");
const se = new SconEncoder({referencedStrings: true});
const sd = new SconDecoder();
const testVal = {
	hello: "world",
	array: ["stuff", 3, 5, 7],
	number: 1337,
	float: 13.37
};
for(let i = 0; i < 500; i += 1){
	testVal[i.toString(36)] = Math.random() * 10000 | 0;
	// testVal[i.toString(36)] = Math.random() * 10000;
	testVal[(i + 500).toString(36)] = Math.random().toString(36);
	testVal[(i + 1000).toString(36)] = "test";
}
const encodedJson = JSON.stringify(testVal);
const encodedScon = se.encode(testVal);
suite.add("JSON Encode", () => {
	// eslint-disable-next-line no-unused-vars
	const something = JSON.stringify(testVal);
});
suite.add("SCON Encode", () => {
	// eslint-disable-next-line no-unused-vars
	const something = se.encode(testVal);
});

suite.add("JSON Decode", () => {
	// eslint-disable-next-line no-unused-vars
	const something = JSON.parse(encodedJson);
});
suite.add("SCON Decode", () => {
	// eslint-disable-next-line no-unused-vars
	const something = sd.decode(encodedScon);
});
// add listeners
suite.on("cycle", event => {
	console.log(String(event.target));
}).on("complete", function(){
	// eslint-disable-next-line no-invalid-this
	console.log(`Fastest is ${this.filter("fastest").map("name")}`);
})
	.run({async: true, minTime: 30, minSamples: 100});
