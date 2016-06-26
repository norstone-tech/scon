if ( true ){
	var encoded = scon.encode( { hello: "world!!", hi: "bye", five: NaN, pi: 3.14159, object:{amazing:true,true:{"mind":"fuck"}}, six: 6 ,arr:["wan","too","free",{"for":4},[1,2,3,4,5]]});
	console.log( "encoded:", encoded );

	var decoded = scon.decode( encoded.result );
	console.log( "decoded:", decoded);
}
