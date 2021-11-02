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
	testVal[i.toString(36)] = Math.random().toString(36);
	// testVal[(i + 1000).toString(36)] = "test";
}
const encodedJson = JSON.stringify(testVal);
const encodedScon = se.encode(testVal);
console.time("JSON Encode");
for(let i = 0; i < testCount; i += 1){
	const something = JSON.stringify(testVal);
}
console.timeEnd("JSON Encode");
console.time("SCON Encode");
for(let i = 0; i < testCount; i += 1){
	const something = se.encode(testVal);
}
console.timeEnd("SCON Encode");
console.time("JSON Decode");
for(let i = 0; i < testCount; i += 1){
	const something = JSON.parse(encodedJson);
}
console.timeEnd("JSON Decode");
console.time("SCON Decode");
for(let i = 0; i < testCount; i += 1){
	const something = sd.decode(encodedScon);
}
console.timeEnd("SCON Decode");
