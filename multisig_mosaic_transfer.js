//NEM標準時
var NEM_EPOCH = Date.UTC(2015, 2, 29, 0, 6, 25, 0);
var _hexEncodeArray = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];

function hex2ua_reversed(hexx) {
	var hex = hexx.toString();//force conversion
	var ua = new Uint8Array(hex.length / 2);
	for (var i = 0; i < hex.length; i += 2) {
		ua[ua.length - 1 - (i / 2)] = parseInt(hex.substr(i, 2), 16);
	}
	return ua;
};

function ua2hex(ua) {
	var s = '';
	for (var i = 0; i < ua.length; i++) {
		var code = ua[i];
		s += _hexEncodeArray[code >>> 4];
		s += _hexEncodeArray[code & 0x0F];
	}
	return s;
};
	
function hex2ua (hexx) {
	var hex = hexx.toString();//force conversion
	var ua = new Uint8Array(hex.length / 2);
	for (var i = 0; i < hex.length; i += 2) {
		ua[i / 2] = parseInt(hex.substr(i, 2), 16);
	}
	return ua;
};

function mosaicIdToName(mosaicId) {
	return mosaicId.namespaceId + ":" + mosaicId.name;
}

function _serializeMosaics(entity) {
	var r = new ArrayBuffer(276*10 + 4);
	var d = new Uint32Array(r);
	var b = new Uint8Array(r);

	var i = 0;
	var e = 0;

	d[i++] = entity.length;
	e += 4;

	var temporary = [];
	for (var j=0; j<entity.length; ++j) {
		temporary.push({'entity':entity[j], 'value':mosaicIdToName(entity[j].mosaicId) + " : " + entity[j].quantity})
	}
	temporary.sort(function(a, b) {return a.value < b.value ? -1 : a.value > b.value;});

	for (var j=0; j<temporary.length; ++j) {
		var entity = temporary[j].entity;
		var serializedMosaic = _serializeMosaicAndQuantity(entity);
		for (var k=0; k<serializedMosaic.length; ++k) {
			b[e++] = serializedMosaic[k];
		}
	}

	return new Uint8Array(r, 0, e);
};

function _serializeMosaicId(mosaicId) {
	var r = new ArrayBuffer(264);
	var serializedNamespaceId = _serializeSafeString(mosaicId.namespaceId);
	var serializedName = _serializeSafeString(mosaicId.name);

	var b = new Uint8Array(r);
	var d = new Uint32Array(r);
	d[0] = serializedNamespaceId.length + serializedName.length;
	var e = 4;
	for (var j=0; j<serializedNamespaceId.length; ++j) {
		b[e++] = serializedNamespaceId[j];
	}
	for (var j=0; j<serializedName.length; ++j) {
		b[e++] = serializedName[j];
	}
	return new Uint8Array(r, 0, e);
}

function _serializeLong(value) {
	var r = new ArrayBuffer(8);
	var d = new Uint32Array(r);
	d[0] = value;
	d[1] = Math.floor((value / 0x100000000));
	return new Uint8Array(r, 0, 8);
}

function _serializeMosaicAndQuantity(mosaic) {
	var r = new ArrayBuffer(4 + 264 + 8);
	var serializedMosaicId = _serializeMosaicId(mosaic.mosaicId);
	var serializedQuantity = _serializeLong(mosaic.quantity);

	//console.log(convert.ua2hex(serializedQuantity), serializedMosaicId, serializedQuantity);

	var b = new Uint8Array(r);
	var d = new Uint32Array(r);
	d[0] = serializedMosaicId.length + serializedQuantity.length;
	var e = 4;
	for (var j=0; j<serializedMosaicId.length; ++j) {
		b[e++] = serializedMosaicId[j];
	}
	for (var j=0; j<serializedQuantity.length; ++j) {
		b[e++] = serializedQuantity[j];
	}
	return new Uint8Array(r, 0, e);
};

function _serializeSafeString(str) {
	var r = new ArrayBuffer(132);
	var d = new Uint32Array(r);
	var b = new Uint8Array(r);

	var e = 4;
	if (str === null) {
		d[0] = 0xffffffff;

	} else {
		d[0] = str.length;
		for (var j = 0; j < str.length; ++j) {
			b[e++] = str.charCodeAt(j);
		}
	}
	return new Uint8Array(r, 0, e);
}

function serializeTransferTransaction (entity) {

	var r = new ArrayBuffer(512 + 2764);
	var d = new Uint32Array(r);
	var b = new Uint8Array(r);
	d[0] = entity['type'];
	d[1] = entity['version'];
	d[2] = entity['timeStamp'];

	var temp = hex2ua(entity['signer']);
	d[3] = temp.length;
	var e = 16;
	for (var j = 0; j<temp.length; ++j) { b[e++] = temp[j]; }

	// Transaction
	var i = e / 4;
	d[i++] = entity['fee'];
	d[i++] = Math.floor((entity['fee'] / 0x100000000));
	d[i++] = entity['deadline'];
	e += 12;

	// TransferTransaction
	if (d[0] === 0x101) {

		d[i++] = entity['recipient'].length;
		e += 4;
		// TODO: check that entity['recipient'].length is always 40 bytes
		for (var j = 0; j < entity['recipient'].length; ++j) {
			b[e++] = entity['recipient'].charCodeAt(j);
		}
		i = e / 4;
		d[i++] = entity['amount'];
		d[i++] = Math.floor((entity['amount'] / 0x100000000));
		e += 8;

		if (entity['message']['type'] === 1 || entity['message']['type'] === 2) {
			var temp = hex2ua(entity['message']['payload']);
			if (temp.length === 0) {
				d[i++] = 0;
				e += 4;
			} else {
				// length of a message object
				d[i++] = 8 + temp.length;
				// object itself
				d[i++] = entity['message']['type'];
				d[i++] = temp.length;
				e += 12;
				for (var j = 0; j<temp.length; ++j) { b[e++] = temp[j]; }
			}
		}

		var entityVersion = d[1] & 0xffffff;
		if (entityVersion >= 2) {
			var temp = _serializeMosaics(entity['mosaics']);
			for (var j = 0; j<temp.length; ++j) { b[e++] = temp[j]; }
		}

	} else if (d[0] === 0x1002) {
		var temp = hex2ua(entity['otherHash']['data']);
		// length of a hash object....
		d[i++] = 4 + temp.length;
		// object itself
		d[i++] = temp.length;
		e += 8;
		for (var j = 0; j<temp.length; ++j) { b[e++] = temp[j]; }
		i = e / 4;

		temp = entity['otherAccount'];
		d[i++] = temp.length;
		e += 4;
		for (var j = 0; j < temp.length; ++j) {
			b[e++] = temp.charCodeAt(j);
		}

	// Multisig wrapped transaction
	} else if (d[0] === 0x1004) {
		var temp = serializeTransferTransaction(entity['otherTrans']);
		d[i++] = temp.length;
		e += 4;
		for (var j = 0; j<temp.length; ++j) { b[e++] = temp[j]; }
	}
	return new Uint8Array(r, 0, e);
}

function calcXemEquivalent(multiplier, q, sup, divisibility) {
	if (sup === 0) {
		return 0;
	}
	// TODO: can this go out of JS (2^54) bounds? (possible BUG)
	return 8999999999 * q * multiplier / sup / Math.pow(10, divisibility + 6);
}


function CALC_MIN_FEE(numNem) {
	return Math.ceil(Math.max(10 - numNem, 2, Math.floor(Math.atan(numNem / 150000.0) * 3 * 33)));
}

var CURRENT_NETWORK_ID = -104; //テストネット
var CURRENT_NETWORK_VERSION = function(val) {

	if (CURRENT_NETWORK_ID === 104) {
		return 0x68000000 | val;
	} else if (CURRENT_NETWORK_ID === -104) {
		return 0x98000000 | val;
	}
	return 0x60000000 | val;
};

function fixPrivateKey(privatekey) {
	return ("0000000000000000000000000000000000000000000000000000000000000000" + privatekey.replace(/^00/, '')).slice(-64);
}

//承認処理
function prepareSignature() {
	var kp = KeyPair.create(fixPrivateKey(SENDER_PRIVATE_KEY2));
	var actualSender = kp.publicKey.toString();
	var due = 60;
	var otherHash = null;

	var timeStamp = Math.floor((Date.now() / 1000) - (NEM_EPOCH / 1000));
	var version = CURRENT_NETWORK_VERSION(1);

	var data ={
		'type': 0x1002,
		'version': CURRENT_NETWORK_VERSION(1),
		'signer': SENDER_PUBLIC_KEY2,
		'timeStamp': timeStamp,
		'deadline': timeStamp + due * 60
	};

	var custom = {
		'otherHash': { 'data': TRANSACTION_HASH },
		'otherAccount': MULTISIG_ADDRESS,
		'fee': MSIG_FEE,
	};
	var entity = $.extend(data, custom);

	var result = serializeTransferTransaction(entity);
	var signature = kp.sign(result);
	var obj = {'data':ua2hex(result), 'signature':signature.toString()};
	console.log(entity);

	return $.ajax({
		url: URL_TRANSACTION_ANNOUNCE  ,
		type: 'POST',
		contentType:'application/json',
		data: JSON.stringify(obj)  ,
		error: function(XMLHttpRequest) {
			console.log( $.parseJSON(XMLHttpRequest.responseText));
		}
	});
}

//申請処理
function mosaicTransferRequest(){

	var amount = parseInt(MULTIPLIER * 1000000, 10);
	var due = 60;
	var timeStamp = Math.floor((Date.now() / 1000) - (NEM_EPOCH / 1000));

	var message = {payload:"",type:1};

	var data ={
		'type': 0x101,
		'version': CURRENT_NETWORK_VERSION(2),
		'signer': MULTISIG_PUBLIC_KEY,
		'timeStamp': timeStamp,
		'deadline': timeStamp + due * 60
	};
	var custom = {
		'recipient': RECIPIENT_ADDRESS,
		'amount': amount,
		'fee': SEND_FEE,
		'message': message,
		'mosaics': MOSAICS
	};
	var entity = $.extend(data, custom);

	var data2 = {
		'type': 0x1004,
		'version': CURRENT_NETWORK_VERSION(1),
		'signer': SENDER_PUBLIC_KEY1,
		'timeStamp': timeStamp,
		'deadline': timeStamp + due * 60
	}
	var custom2 = {
		'fee': MSIG_FEE,
		'otherTrans': entity
		
	}
	var entity2 = $.extend(data2, custom2);

	var result = serializeTransferTransaction(entity2);
	var kp = KeyPair.create(fixPrivateKey(SENDER_PRIVATE_KEY1));  
	var signature = kp.sign(result);
	var obj = {'data':ua2hex(result), 'signature':signature.toString()};
	console.log(entity2);
	console.log(result);
	console.log(obj);

	return $.ajax({
		url: URL_TRANSACTION_ANNOUNCE  ,
		type: 'POST',
		contentType:'application/json',
		data: JSON.stringify(obj)  ,
		error: function(XMLHttpRequest) {
			console.log( $.parseJSON(XMLHttpRequest.responseText));
		}
	});
}

