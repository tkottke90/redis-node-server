var crypto = require('crypto');

function genSalt(length){
	var key = "";

	while(key.length < length){
		 key += Math.random().toString(16).substring(2);
	}

	return key;
}

function encrypt(str){
	console.log(`Input String: ${str}`);	

	var salt = genSalt(10);

	console.log(`Salt: ${salt}`);

	str = str + salt;
		
	console.log(`Salted Input String: ${str}`);

	var encryptStr = crypto.createHmac('sha512', "Node.js").update(str).digest('hex');

	console.log(`Encrypted String ${encryptStr}`);
}

encrypt('thomas');
