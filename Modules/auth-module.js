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

// Variables
    var client = redis.client;

module.exports = {

    keyRequest(){},

    newKey(email, password, callback){
        var key, counter = 0;
        do{
            key = generateKey(26);
            counter++;

            if(counter > 10){
                smc.getMessage(1,7,"Long Running Key Generation");
            }
        }while(keyExsists(key));

        var value = key_template;
        value["createDate"] = new Date().valueOf();
        value["lastChangeDate"] = new Date().valueOf();
        value["requester_Email"] = email;
        value["password"] = password;

        client.set(key,JSON.stringify(value),function(err, res){
            if(err){
                smc.getMessage(1,5,`Error Generating Key: \n ${err}`);
                if(typeof callback == 'function') {return callback(err, null);}
                else { return "OK"; }
            }
            
            smc.getMessage(1,null,`New Key Added: ${key}`);
            if(typeof callback == 'function') {return callback(null, key);}
            else { return "OK"; }
        });
    },

    newTempKey(){},

    // Verify Key Exists and Password is correct
    authKey(){},


}


// Auth Methods
    // New

    // Existing

    // Temporary

    // Remove

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
