/**
 * Swift-Cardinal Object Notation
 * https://github.com/BlueStone-Tech-Enterprises/scon/
 *
 * Copyright (c) BlueStone Technological Enterprises Inc., 2016-2017
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

const scon = {};
const sconUtil = require( "./util.js" );

sconUtil.loadSubmodule( scon, "lib/conf.js" );
sconUtil.loadSubmodule( scon, "lib/error.js" );
sconUtil.loadSubmodule( scon, "lib/bufferWrapper.js" );


const checkBufferLength = function*(bo,length){
	if (bo.offset + length > bo.buff.length){
		//throw new Error("testing")
		bo.buff = yield([bo.buff.slice(bo.offset)]); //Return the unread parts of the array.
		while (bo.buff.length < length){
			bo.buff = yield([bo.buff]);
		}
		bo.offset = 0;
	}
}

scon.decodeInt = function*(bo,byteLength){
	yield* checkBufferLength(bo,byteLength);
	const buff = bo.buff;
	const bytelen = byteLength;
	const offset = bo.offset;
	
	let i = byteLength;
	let mul = 1;
	let val = buff[offset + --i];
	while (i > 0 && (mul *= 0x100)){
		val += buff[offset + --i] * mul;
	}
		
	mul *= 0x80;
	if (val >= mul){
		val -= Math.pow(2, 8 * byteLength);
	}
	bo.offset += bytelen;
	bo.stack.push(val);
}
scon.decodeUInt = function*(bo,byteLength){
	yield* checkBufferLength(bo,byteLength);
	const buff = bo.buff;
	const offset = bo.offset;
	const bytelen = byteLength;
	
	let val = buff[offset + --byteLength];
	let mul = 1;
	while (byteLength > 0 && (mul *= 0x100)){
		val += buff[offset + --byteLength] * mul;
	}
	
	
	bo.offset += bytelen;
	bo.stack.push(val);
}


scon.decodeCompound = function*(bo,checkmagicNumber){ // Internal function
	//bo stands for buffer and offset :)
	if (checkmagicNumber){
		let validSCONFile = true;
		for (let i=0;i<scon.magicNumberArr.length;i+=1){
			if (bo.buff[i+bo.offset] != scon.magicNumberArr[i]){
				validSCONFile = false;
				break;
			}
		}
		if (validSCONFile){
			bo.offset += scon.magicNumberArr.length;
		}else{
			throw new scon.Exception( scon.errorCodes.noMagicNumber );
		}
	}
	const result = {}
	while (true){
		yield* checkBufferLength(bo,1);
		let type = bo.buff[bo.offset]; bo.offset += 1;
		let shortType = false;
		if (type >= 128){
			shortType = true;
			type -= 128;
		}
		
		if (type === scon.endBlock){
			break; // We've reached the end of the file.
		}
		yield* scon.decodeKey(bo,shortType); // 1 item on stack
		const key = bo.stack.pop(); 
		yield* scon.decodeValue(bo,type); // 1 item on stack
		result[key] = bo.stack.pop()
		
	}
	bo.stack.push(result);
}

scon.decodeValue = function*(bo,type){
	let result;
	if (type>=scon.int8 && type<=scon.int64){
		
		const bytelen = type - scon.int8 + 1;
		yield* scon.decodeInt(bo,bytelen);// bo.offset += bytelen;
		result = bo.stack.pop();
	}else if (type>=scon.uint8 && type<=scon.uint64){
		
		const bytelen = type - scon.uint8 + 1;
		yield* scon.decodeUInt(bo,bytelen);// bo.offset += bytelen;
		result = bo.stack.pop();
	}else if (type>=scon.string8 && type<=scon.string64){
		
		const bytelen = type - scon.string8 + 1;
		yield* scon.decodeUInt(bo,bytelen);// bo.offset += bytelen;
		const varlen = bo.stack.pop();
		yield* checkBufferLength(bo,varlen);
		result = bo.buff.slice(bo.offset,bo.offset+varlen); bo.offset += varlen;
		
	}else if (type>=scon.utf8string8 && type<=scon.utf8string64){
		//console.log("It's a string!");
		const bytelen = type - scon.utf8string8 + 1;
		//console.log("bytelen:"+bytelen);
		yield* scon.decodeUInt(bo,bytelen); //bo.offset += bytelen;
		const varlen = bo.stack.pop();
		//console.log("varlen:"+varlen);
		yield* checkBufferLength(bo,varlen);
		result = scon.bufferToString(bo.buff.slice(bo.offset,bo.offset+varlen)); bo.offset += varlen;
		//console.log("buff:"+bo.buff);
		//console.log("result is:"+result);
	}else if (type>=scon.array8 && type<=scon.array64){
		
		const bytelen = type - scon.array8 + 1;
		yield* scon.decodeUInt(bo,bytelen); //bo.offset += bytelen;
		const varlen = bo.stack.pop();
		
		result = [];
		
		for ( let i = 0; i < varlen ; i += 1 ){
			yield* checkBufferLength(bo,1);
			let itype = bo.buff[bo.offset]; bo.offset += 1;
			yield* scon.decodeValue(bo,itype)
			result[i] = bo.stack.pop()
		}
	}else{
		
		switch( type ){
			case scon.endBlock:
			case scon.undefined: 
				break;
			case scon.compound:
				yield* scon.decodeCompound(bo,false);
				result = bo.stack.pop()
				break;
			case scon.null:
				result = null;
				break;
			case scon.boolean:
				checkBufferLength(bo,1);
				result = bo.buff[bo.offset] !== 0; bo.offset += 1;
				break;
			case scon.nan:
				result = NaN;
				break;
				
			case scon.int0:
			case scon.uint0:
				result = 0;
				break;
			case scon.float32:
				yield* checkBufferLength(bo,4);
				//JS handles floats as LE, but SCON stores them as BE, so we gotta convert!
				var LEFloat = scon.bufferAllocFixedLen(4);
				//console.log(LEFloat.buffer);
				for (let i=0;i<LEFloat.length;i+=1){
					LEFloat[i] = bo.buff[bo.offset+LEFloat.length-i-1];
				}
				result = (new Float32Array(LEFloat.buffer))[0]
				bo.offset += 4;
				break;
			case scon.float64:
				yield* checkBufferLength(bo,8);
				//JS handles floats as LE, but SCON stores them as BE, so we gotta convert!
				var LEFloat = scon.bufferAllocFixedLen(8);
				//console.log(LEFloat.buffer);
				for (let i=0;i<LEFloat.length;i+=1){
					LEFloat[i] = bo.buff[bo.offset+LEFloat.length-i-1];
				}
				result = (new Float64Array(LEFloat.buffer))[0]
				bo.offset += 8;
				break;
			case scon.utf8string0:
				result = "";
				break;
			case scon.array0:
				result = []
				break;	
			case scon.string0:
				result = scon.bufferAlloc(0);
				break;
			case scon.floatInf:
				result = Number.POSITIVE_INFINITY;
				break;
			case scon.floatNegInf:
				result = Number.NEGATIVE_INFINITY;
				break;
			case scon.boolfalse:
				result = false;
				break;
			case scon.booltrue:
				result = true;
				break;
			default:
				throw new scon.Exception( scon.errorCodes.unknownObjectType, type );
				break;
			
		}
	}
	bo.stack.push(result);
}


scon.decodeKey = function*(bo,shortType){
	let keylen;
	if (shortType){
		yield* checkBufferLength(bo,1);
		keylen = bo.buff[bo.offset]; bo.offset += 1;
	}else{
		yield* checkBufferLength(bo,2);
		keylen = (bo.buff[bo.offset] << 8) | bo.buff[bo.offset += 1]; bo.offset += 1;
	}
	yield* checkBufferLength(bo,keylen);
	const key = scon.bufferToString(bo.buff.slice(bo.offset,bo.offset+keylen));
	bo.offset += keylen;
	bo.stack.push(key);
}

const startCoroutineDecode = function*(checkmagicNumber) {
	const buff = yield;
	const bo = {buff:buff,offset:0,stack:[]};
	if (checkmagicNumber==null){
		checkmagicNumber = true;
	}
    yield* scon.decodeCompound(bo,checkmagicNumber); // Pushes 1 item on the stack
	const result = bo.stack.pop();
	const unreadArr = bo.buff.slice(bo.offset);
	yield([unreadArr,result]);
}

scon.partialDecode = function(buff,obj,checkmagicNumber){
	if (!(buff instanceof Uint8Array)){
		throw new TypeError("Buffer must be an instance of Uint8Array")
	}
	let func;
	if (obj){
		func = obj.func;
	}else{
		func = startCoroutineDecode(checkmagicNumber);
		func.next(); // Go to first yield
	}
	let newobj = func.next(buff);
	newobj.func = func;
	newobj.unread = newobj.value[0];
	if (newobj.value[1]){
		func.next(); // Finish the thing up so it's officially done.
		newobj.result = newobj.value[1];
		newobj.done = true;
	}
	delete newobj.value;
	return newobj;
}


var charCodeSymbols = [
"NUL",
"SOH",
"STX",
"ETX",
"EOT",
"ENQ",
"ACK",
"BEL",
"BS",
"TAB",
"LF",
"VT",
"FF",
"CR",
"SO",
"SI",
"DLE",
"DC1",
"DC2",
"DC3",
"DC4",
"NAK",
"SYN",
"ETB",
"CAN",
"EM",
"SUB",
"ESC",
"FS",
"GS",
"RS",
"US",
"space"
];
var debugArr = function(arr){
	console.log("Stuff:")
	for(let i=0;i<arr.length;i+=1){
		console.log(i+": "+arr[i]+" "+(charCodeSymbols[arr[i]] || String.fromCharCode(arr[i])))
	}
}


scon.decode = function(buff,checkmagicNumber){
	const result = scon.partialDecode(buff,null,checkmagicNumber);
	if (result.done){
		//debugArr(result.unread);
		return result.result;
	}else{
		//debugArr(result.unread);
		throw new scon.Exception( scon.errorCodes.endOfFileTooSoon );
	}
}

scon.streamDecode = function(callback,checkmagicNumber){
	let unread;
	let partObj;
	let func = function(chunk){
		if (chunk == null){
			chunk = unread;
			unread = null;
		}else if (!(chunk instanceof Uint8Array)){
			if (typeof chunk !== "string"){
				return; //ignore
			}
			let newChunk = scon.bufferAlloc(chunk.length);
			for (let i=0;i<chunk.length;i+=1){
				newChunk[i] = chunk[i];
			}
			chunk = newChunk;
		
		}
		if (unread != null && unread.length !== 0){
			var c = scon.bufferAlloc(unread.length + chunk.length);
			c.set(unread);
			c.set(chunk, unread.length);
			chunk = c;
		}
		partObj = scon.partialDecode(chunk,partObj,checkmagicNumber);
		unread = partObj.unread;
		delete partObj.unread;
		if(partObj.done){
			callback(partObj.result);
			partObj = null;
			if (unread.length > 0){
				// Yes, I know that if there are multiple complete scons per chunk the callback will by called in sync.
				// This is intentional. I need to make sure that any complete scons are flushed before the next chunk arrives.
				func()
			}else{
				unread = null;
			}
		}
		
		
	}
	return func;
};

module.exports = scon;
