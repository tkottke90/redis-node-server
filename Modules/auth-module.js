/**
 * Module is designed to create and manage active and authorized projects.
 * 
 * Module Features
 *  - Take Requests for new project
 *  - Create and serve a key to request
 *  - Create and serve a temporary key request
 *  - Manage Temporary Keys
 *  - Check if a Key exists / approve transaction
 * 
 */

// Import Modules
var path = require("path"),
    crypto = require('crypto');
    smc = require("./server-message-creator.js"),
    redis = require("./redis-module.js"),
    mailer = require("express-mailer");

// JSON Template used when a new key is created.  
//
// Properties:
//      createDate - creation date of the key
//      deleteDate - when key will be deleted. Stored as milliseconds since 1/1/1970 or Date.valueOf().  -1 means key will never be removed
//      root - root node for data the user wishes to store
var key_template = {
    "createDate" : "",
    "deleteDate" : -1,
    "lastChangeDate" : "",
    "requester_Email" : "",
    "password" : "",
    "root" : {}
}

var redis_key_ref = "key_ref"
var redis_temp_keys = "temp_key_ref";
var key_ref = [];
var temp_keys = [];

// Variables
    var client = redis.client;

    var encryptionKey = "Node.js";

module.exports = {

    keyRequest(){},

    // Generates a New Key and adds it to the Redis DB and returns the key
    newKey(email, password, callback){
        // Generate New Key
        var key = "", counter = 0;
        do{
            key = generateKey(26);
            counter++;

            if(counter > 10){
                smc.getMessage(1,7,"Long Running Key Generation");
            }
        }while(keyExsists(key));
        
        
        // TO-DO: Encrypt Password
        var salt = generateKey(10);      
        password = crypto.createHmac('sha512', encryptionKey).update(password + salt).digest('hex');
        var pass = {
            "salt" : salt,
            "password" :  password
        };  
        //
        
        var value = {  };

        client.hmset(key,
            [
                'name', '',
                'User_Email', email,
                'password', pass,
                'expire', '-1',
                "Date_Create", new Date().valueOf().toString(),
                "Date_Last_Mod", new Date().valueOf().toString(),
                "Data", JSON.stringify(value)
            ],
            function(err, res){
            if(err){
                if(typeof callback == 'function') {return callback(err, null);}
                else { return "Error"; }
            }
            else {
                client.SADD(redis_key_ref, [key],function(err,res){
                    if(err){ console.log(err); }
                });

                smc.getMessage(1,null,`New Key Added: ${key}`);
                if(typeof callback == 'function') {return callback(null, key);}
                else { return "OK"; }
            }
        });
    },

    /**
     * Method take addition paramter than newKey() that is the expiration of the key if the project only needs the key temporarily
     * @param {string} email - String of users email address.  This will come from the request and is passed as a reference to the user 
     * @param {string} password (Optional) - Password to protect information stored by this key
     * @param {number} expiration - Number represting the Millisecond timestamp of when the key will expire.  Can be gathered by using the Date.valueOf() method
     * @param {function} callback - Child Process' are asynchronous, this method inherits that attribute 
     */
    newTempKey(email, password, expiration, callback){
        var mod = new Date().valueOf();

        expire = Math.ceil(getDateDiff(new Date(expiration), new Date()) / 1000);
        console.log(expiration);
        console.log(new Date().valueOf());
        console.log(new Date(expiration).toLocaleTimeString());
        console.log(expire);

        this.newKey(email, password, function(err, key){
            console.log(key);
            if(err){ if(typeof callback == "function"){ return callback(err,null) } }
                client.HMSET(key,{ "expire" : expiration, "Date_Last_Mod" : mod }, function(err){
                    if(err) { if(typeof callback == "function"){ return callback(err,null) } }
                    else { 
                        // Calculate time till expire
                        client.EXPIRE(key,expire,function(err){ if(err){ smc.getMessage(1,5,`Error setting expireation on key: ${key} to ${expiration}`); } });


                        client.SADD(redis_temp_keys,[key], function(err){
                            if(err){ if(typeof callback == "function"){ return callback(err,null) } }
                        });

                        if(typeof callback == "function"){ return callback(null, key) }
                    }
                });
        });
    },

    // Verify Key Exists and Password is correct
    authKey(key, password, callback){
        client.HGET(key,"password", function(err, data){
            if(err){ response(err,null); }
            if(data){
                // Get Stored Information
                data  = JSON.parse(data);
                var salt = data['salt'];
                var storedPass = data['password'];

                // Generate Encrypted Version of Entered Password
                var hash = crypto.createHmac('sha512', encryptionKey).update(password+salt).digest('hex');

                // Compare to Stored Password
                if(storedPass === hash){
                    response(null,true);    
                } else {
                    response(null,false);
                }            
            }

            function response(err,result){ 
                switch(typeof callback){
                    case "function":
                        if(err){ callback(err,null); }
                        else{ callback(null, result); }
                        break;
                    default:
                        if(err) { return `Error In Authorization: ${err}` } 
                        else{ return result }
                    }

            }
        });
    },

    // Request to remove a key
    deleteKeyReq(key, password){
        
    }


}

client.once('ready',function(err){
    if(err) { throw err; }
    // Check for Key Reference List
    client.exists(redis_key_ref, function(err, data){
        if(err) { smc.getMessage(1,5,`Error Accessing Keys: ${err}`); 
        } else if(data == 0) {
            key_ref = [];
        } else {
            client.SMEMBERS(redis_key_ref, function(err, data){
                if(err){ smc.getMessage(1,5,"Error getting key set"); }
                else {
                    key_ref = data;
                }
            });
        }
    });

    // Check for Temporary Key Reference List
    client.exists(redis_temp_keys,function(err, data){
        if(err) { smc.getMessage(1,5,`Error Accessing Temp_Keys: ${err}`); }
        else if(data == 0) {
            key_ref = [];
        } else {
            client.SMEMBERS(redis_temp_keys, function(err, data){
                if(err) { smc.getMessage(1,5,`Error getting Temp_Keys: ${err}`); }
                else { 
                    temp_keys = data;
                }
            });          
        }
    });
});

// Key Processing
    // Create New Key
    function generateKey(length){
        var key = "";
        while (key.length < length){
             key += Math.random().toString(16).substring(2);
        }
        return key;
    }

    // Key Exists
    function keyExsists(key){
        client.exists(key,function(err, exists){
            if(err){ 
                smc.getMessage(0,5,`Error Checking Key Exists: ${err}`)
                return false;
            }
            return exists == 0;
        });
    }

    // Remove Key
    function removeKey(){}

    // Utility Module
    function getDateDiff( date1, date2 ){
        if(date1 instanceof Date && date2 instanceof Date){
            var d1 = date1.valueOf(), d2 = date2.valueOf();
        
            return d1 - d2;
        }
        else { return 0; }
    }