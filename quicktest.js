const Benchmark = require('benchmark');
const suite = new Benchmark.Suite("SCON/JSON comparison");
const {SconEncoder, SconDecoder} = require("./");
const se = new SconEncoder({referencedStrings: false});
const sd = new SconDecoder();
const testCount = 100;
const testVal = {
	"hello": "world",
	"array": ["stuff", 3, 5, 7],
	"number": 1337,
	"float": 13.37
}
for(let i = 0; i < 1000; i += 1){
	// testVal[i.toString(36)] = Math.random() * 10000 | 0;
	// testVal[i.toString(36)] = Math.random() * 10000;
	// testVal[i.toString(36)] = Math.random().toString(36);
	// testVal[(i + 1000).toString(36)] = "test";
}
const encodedJson = JSON.stringify(testVal);
const encodedScon = se.encode(testVal);
suite.add("JSON Encode", function() {
	const something = JSON.stringify(testVal);
});
suite.add("SCON Encode", function() {
	const something = se.encode(testVal)
});

suite.add("JSON Decode", function() {
	const something = JSON.parse(encodedJson);
});
suite.add("SCON Decode", function() {
	const something = sd.decode(encodedScon);
});
// add listeners
suite.on('cycle', function(event) {
	console.log(String(event.target));
})
.on('complete', function() {
console.log('Fastest is ' + this.filter('fastest').map('name'));
})
// run async
.run({async: true, minTime: 30, minSamples: 100});