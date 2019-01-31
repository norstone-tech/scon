/**
 * Swift-Cardinal Object Notation
 * https://github.com/BlueStone-Tech-Enterprises/scon/
 *
 * Copyright (c) BlueStone Technological Enterprises Inc., 2018
 * Licensed under the GNU GPLv3 license.
 */

"use strict";

const BufferLib = require("arc-bufferlib");
const scon = {};
const sconUtil = require( "./util.js" );

sconUtil.loadSubmodule( scon, "lib/conf.js" );
sconUtil.loadSubmodule( scon, "lib/error.js" );

// Pointer decode note:
/*
const k = key;
const p = ptr;
Object.defineProperty(obj, k, {
	get: function() {
		delete this[k];
		return this[k] = pointedData[p];
	}
	set: function() {
		delete this[k];
		return this[k] = pointedData[p];
	}
});

*/

class InternalSconDecodeData {
    constructor(buff, cb){
		this.buff = buff;
		this.offset = 0;

		this.pointedData = [];

		this.decodedObjects = [{}];
		this.scopeArray = [0];

        this.callback = cb;
	}
	get decodedObject(){
		return this.decodedObjects[decodedObjects.length - 1];
	}
	newScope(key){
		let newObj = {};
		this.decodedObject[key] = newObj;
		this.decodedObjects.push(newObj);
		return newObj;
	}
	popScope(){
		return this.decodedObjects.pop();
	}
	callbackRead(len, cb){
		let endOffset = this.offset + len;
		if (endOffset <= this.buff.length){
			let subBuffer = this.buff.subarray(this.offset, endOffset);
			this.offset = endOffset;
			return subBuffer;
		}else{
			(async () => {
				try{
					let buff;
					let buffs = [this.buff.subarray(this.offset)];
					let totalLength = buffs[0].length;
					while (totalLength < len){
						buff = await this.callback();
						buffs.push(buff);
						totalLength += buff.length;
					}
					buff = BufferLib.concat(buffs, totalLength);
					this.buff = buff.subarray(len);
					this.offset = 0;
					cb(null, buff.subarray(0, len));
				}catch(ex){
					cb(ex);
				}
			})();
		}
	}
}


const readKey = function(decodeObj, longKey, cb){
	decodeObj.callbackRead(longKey ? 2 : 1, (err, keyLengthBuff) => {
		if (err){
			cb(err);
			return;
		}
		let keyLength = keyLengthBuff[longKey ? 1 : 0];
		if (longKey){
			keyLength |= keyLengthBuff[0] << 8;
		}
		decodeObj.callbackRead(keyLength, (err, keyNameBuff) => {
			try{
				if (err) throw err;
				if (keyNameBuff[0] === 0){

				}else{
					
				}
			}catch(ex){
				cb(ex);
			}
		});
	});
}

const decodeObject = function(decodeObj, cb){
	decodeObj.callbackRead(1, (err, dataType) => {
		try{
			if (err) throw err;
			dataType = dataType[0];
			let longKey = Boolean(dataType & 128);
			if (longKey){
				dataType ^= 128;
			}
			switch(dataType){
				
				case scon.endBlock:
					cb(null);
				break;
				case scon.compound:

				break;
			}
		}catch(ex){
			cb(ex);
		}
	});
};

const checkMagicNumber = function(decodeObj, cb){
	decodeObj.callbackRead(scon.magicNumberArr.length, (err, potentialMagicNumber) => {
		try{
			if (err) throw err;
			for (let i = 0; i < potentialMagicNumber.length; i += 1){
				if (scon.magicNumberArr[i] != potentialMagicNumber[i]){
					throw new scon.Error(scon.errorCodes.noMagicNumber); 
				}
			}
			decodeObject(decodeObj, cb);
		}catch(ex){
			cb(ex);
		}
	});
}

scon.decode = function(buff, options){
	if (typeof options === "boolean"){
		const useMagicNumber = options;
		options = {
			useMagicNumber
		};
	}
	const decodeObj = new InternalSconDecodeData(buff, () => {
		return Promise.reject(new scon.Error(scon.errorCodes.endOfFileTooSoon));
	})
	let err;
	const cb = function(err){
		err = err;
	}
	if (options.useMagicNumber){
		checkMagicNumber(decodeObj, cb);
	}else{
		decodeObject(decodeObj, cb);
	}
	if (err === undefined){
		throw new Error("Some async stuff happened?");
	}else if(err != null){
		throw err;
	}
	return decodeObj.decodedObject;
}

module.exports = scon;