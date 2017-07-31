"use strict"

var root = "";

// Import Modules
    var express = require('express');
    var bparse = require('body-parser');
    var fs = require('fs');
    
    var cypher = require('crypto');
    
    var redis = require('redis');

    var SMC = require('./Modules/server-message-creator.js')
    var RM = require('./Modules/redis-module.js');
    var auth = require('./Modules/auth-module.js');

// Module Variables
    var app = express();
    app.use(bparse.json());
    var client = RM.client;

// RESTful API

    var options = 
    {
        "DEBUG" : {
            "description" : "Enable/Disable Debug Messaging in Service Log",
            "accepted_values" : [ "true", "false" ]
        },
        "monitor" : {
            "descriptions" : "Enable/Disable Redis Monitor in Service Log",
            "accepted_values" : [ "start", "shutdown" ]
        }
    }

    /**
     * Method to get value assodiated with key from Redis DB as a JSON Object
     */
    app.get(`${root}/redis/json/:key`, function(req, res){
        // Get param variables
        var key = req.params.key;

        SMC.getMessage(1,0,`Request for key: ${key}`)
        client.get(key,function(err, data){
            if(err){
                SMC.getMessage(1,5,`Error in GET Request: ${err}`);
                res.status(500).jsonp({error : "Error in DB Request"});
            } else {
                var jsonOut = {};
                jsonOut[key] = data;

                SMC.getMessage(1,0,`Request Completed for ${key}`)
                res.status(200).jsonp(jsonOut);
            }
        });
    });

    /**
     * Method to get value associated with key from Redis DB
     */
    app.get(`${root}/redis/:key`,function(req,res){
        SMC.getMessage(1,0,`Request for key: ${req.params.key}`)
        client.get(req.params.key,function(err, data){
            if(err){
                SMC.getMessage(1,5,`Request Error: ${err}`);
                res.status(500).send("Internal Server Error");
            }
            if(data == null){
                SMC.getMessage(1,0,`No key of ${req.params.key} found`);
                res.send(`No key of ${req.params.key} found`);
            }
            else{
                SMC.getMessage(1,0,`Request completed for key: ${req.params.key}`);
                res.send(data);
            }
        });
    });

    /**
     *  Method will put a new entry into the Redis DB as long as request is formatted propery as JSON Object
     *  
     *  Content-Type: application/json
     * 
     *  { 
     *      "key" : <key>
     *      "value" : <value>
     *  }
     * 
     */
    app.put(`${root}/redis/json`, function(req, res){
        // Set Response Header Info
        res.set('Connection', 'close');

        var body; // Variable to represent body of request
        
        // Check if Request Body is in JSON
        if(!req.is('json')){
            SMC.getMessage(1,5,"Bad Put Request");
            res.jsonp(400, {error: 'Bad Request - JSON Required'});
            return;
        }
        else{
            body = req.body;
        }

        SMC.getMessage(1,2,`Request to add => ${body.key} : ${body.value}`);

        // Get Key and Value to be added
        var key = body.key;
        var value = body.value;

        if( key == null ){
            res.jsonp(400, {error : "No Key Sent"});
            return;
        }

        client.set(key, value, function(err, data){
            if(err){ 
                SMC.getMessage(1,5,"Error Adding Value");
                res.jsonp(500, {error : 'Error Adding Value'});
            }
            else if(data == "OK"){
                SMC.getMessage(1,2,"Added Successfully");
                client.BGSAVE();
                res.jsonp(200, {message: `Added : { ${body.key} : ${body.value} }`});
            }
        });
    });


    /**
     * Method will put a new entry into the Redis DB from the new information in the uri
     */
    app.put(`${root}/redis/:key.:value`, function(req,res){
        
        res.set('Connection', 'close');
        SMC.getMessage(1,2,`Request to add => ${body.key} : ${body.value}`);

        // Get Values from URI
        var key = req.params.key;
        var value = req.params.value;

        if(key != null){
            client.set(key, value, function(err, data){
                if(err){
                    SMC.getMessage(1,5,`Error in PUT Request: ${err}`);
                    res.status(500).jsonp({error : `Bad Request: ${err}`});                    
                } else {
                    SMC.getMessage(1,2,`PUT Requst Successful`);
                    res.status(200).jsonp({ success : `PUT Request - Key: ${key}, Value: ${value}` });
                }
            });
        }else{
            SMC.getMessage(1,5,"Error in PUT Request: Bad/No Key");
            res.status(400).jsonp({error : "Bad Request: no Key included"});
        }
    });

    /**
     * Method will post an update to an existing entry or create an entry with the proper request format
     * 
     *  Content-Type: application/json
     * 
     *  { 
     *      "key" : <key>
     *      "value" : <value>
     *      "overwrite" : <boolean>
     *  }
     */
    app.post(`${root}/redis/json`, function(req, res){
        // Set Response Header Info
        res.set('Connection', 'close');

        var body; // Variable to represent body of request
        
        // Check if Request Body is in JSON
        if(!req.is('json')){
            SMC.getMessage(1,5,"Bad Put Request");
            res.jsonp(400, {error: 'Bad Request - JSON Required'});
            return;
        }
        else{
            body = req.body;
        }

        SMC.getMessage(1,3,`Request to add => ${body.key} : ${body.value}`);

        // Get Key and Value to be added
        var key = body.key;
        var value = body.value;
        var overwrite = body.overwrite == "true";

        if( key == null ){
            res.jsonp(400, {error : "No Key Sent"});
            return;
        }
        client.exists(key, function(err, data){
            var exists = data == 1;

            if(exists && !overwrite){
                SMC.getMessage(1,3,"Key Already Exsists/Overwrite false in reqeust");
                res.status(400).jsonp({ error: "Key Already Exists/Overwrite false in reqeust" });
            } else {
                client.set(key, value, function(err, data){
                    if(err){ 
                        SMC.getMessage(1,5,"Error Adding Value");
                        res.jsonp(500, {error : 'Error Adding Value'});
                    }
                    else if(data == "OK"){
                        data ? SMC.getMessage(1,3,`Redis Updated key: ${body.key}`) : SMC.getMessage(1,2,"Added Item Successfully");
                        client.BGSAVE();
                        data ? res.status(200).jsonp({message: `Updated key: ${body.key}`}) : res.status(200).jsonp({message: `Added : { ${body.key} : ${body.value} }`});
                    }
                });
            }
        });
    }); 

    app.post(`${root}/redis/:key.:value.:overwrite`, function(req, res){
        SMC.getMessage(1,3,`Request to add => ${body.key} : ${body.value}`);
        // Get Values from URI
        var key = req.params.key, 
            value = req.params.value, 
            over = req.params.overwrite == "true";

        client.exists(key,function(err, data){
            var exists = data == 1;
            if(data && over){
                SMC.getMessage(1,3,"Key Already Exsists/Overwrite false in reqeust");
                res.status(400).jsonp({ error: "Key Already Exists/Overwrite false in reqeust" });
            } else{
                client.set(key, value, function(err, data){
                    if(err){ 
                        SMC.getMessage(1,5,"Error Adding Value");
                        res.jsonp(500, {error : 'Error Adding Value'});
                    } else if(data == "OK"){
                        data ? SMC.getMessage(1,3,`Redis Updated key: ${body.key}`) : SMC.getMessage(1,2,"Added Item Successfully");
                        client.BGSAVE();
                        data ? res.status(200).jsonp({message: `Updated key: ${body.key}`}) : res.status(200).jsonp({message: `Added : { ${body.key} : ${body.value} }`});
                    }
                });
            }  
        });
    });

    /**
     * Method will "delete" a key from the active Redis DB.  Uses File System Module to 
     * write key and value to a json doc incase the data was deleted accidentally, it can be recovered.
     * 
     * Once the data has been collected using the Get command, writing the data to the delete log and deleting
     * from the DB are run as separate as they do not depend on each other to complete
     */
    app.delete(`${root}/redis/:key`, function(req, res){
        client.get(req.params.key, function(err, data){
            if(err){ res.status(500).jsonp({ error : "Error in get" }) }
            
            if(data != null){
                // Get Key-Value pair
                var key = req.params.key;
                var value = data;
            
                // Write deletion to log
                fs.readFile('./delete_log.json', function(err, data){
                    // Parse Delete Log
                    data = JSON.parse(data);
                    // Get Unique Identifier
                    var timestamp = new Date().valueOf();
                    
                    // Add deleted key-value pair to data JSON Object
                    data["log"][ timestamp ] = { key : key, value : value };
                    
                    // Write back to delete log
                    fs.writeFile('./delete_log.json', JSON.stringify(data),function(err, data){
                        if(err){ 
                            SMC.getMessage(1,5,"Error Writing to File")
                            res.status(500).jsonp({ error : "Error deleting key" });
                        }
                    });
                });

                // Delete Key-Value Pair from DB
                client.del(req.params.key,function(err, data){
                    if(err){ SMC.getMessage(1,5,"Error Deleting Key"); }
                    else{ 
                        SMC.getMessage(1,4,`Deleted "${key}" from Redis DB Success`)
                        res.status(200).jsonp({ success : `Deleted Key: ${key}` }); 
                    }
                });
            }
            else{ res.status(400).jsonp({ error : `No key of ${req.params.key} found` }); }
        });
    });

    // Method will return a list of supported operations for the serivce
    app.get(`${root}/options`, function(req, res){
        res.status(200).json(options);
    });

    app.put(`${root}/options/set`, function(req,res){});

    // Method will update option in key
    app.put(`${root}/options/set/:option.:value`, function(req, res){
        var option = req.params.option;
        var val = req.params.value;

        res.set('Connection', 'close');

        switch(option){
            case "DEBUG":
                switch(val){
                    case "true":
                        SMC.getMessage(0,null,"DEBUG Enabled");
                        RM.setDEBUG(true);
                        res.status(200).jsonp({ success : "Debugging Enabled"});
                        break;
                    case "false":
                        SMC.getMessage(0,null,"DEBUG Disabled");
                        RM.setDEBUG(false);
                        res.status(200).jsonp({ success : "Debugging Disabled"});
                        break;
                    default:
                        SMC.getMessage(0,null,"Attempt to Edit DEBUG Option Failed");
                        res.status(400).jsonp({ error : "Incorrect value for DEBUG option, see /options for accepted inputs" });
                }
                break;
            case "monitor":
                if(val == "start" || val == "shutdown"){
                    RM.redisMonitor(val,function(err, resp){
                        resp == "OK" ? res.status(200).send('OK') : res.send(resp);
                        resp == "OK" ? val == "start" ? SMC.getMessage(1,null,"Database Monitoring Enabled") :SMC.getMessage(1,null,"Database Monitoring Disabled") : SMC.getMessage(1,5,"Error Enabling Redis Monitor " + resp);
               
                    });
                }
                else{
                    res.status(400).jsonp({ errror : "Incorrect value for monitor option, see /options for accepted inputs"});
                }
                break;
            default:
                res.status(400).jsonp({ error : `No Option of ${option} found, please run /options to view list of available options`});
        }
    });


// App Methods

    app.get(`${root}/`, function(req, res){
        SMC.getMessage(0,null,"Connection Check to Redis-Node.JS Server");
        var nodeVersion = "v7.6.0";

        res.json({
            "Message" : "Connection Successful",
            "Server Info" : {
                "port" : server.port,
                "framework" : "Node.JS",
                "version" : "v7.6.0",
                "commands" : {
                    "GET_Server_Connection" : "/"
                }
            }
        });
    });

    /**
     * Method uses redis scan command to get a list of keys from redis db
     */
    app.get(`${root}/redis/scan`,function(req, res){

        client.scan("0", function(err, data){
            console.log(data[0]);
            console.log(data[1]);
        
            if(!err){res.send("success");}
        
        });

    });


// FileSystem Methods

    /**
     * Method checks to see if Delete Log File exists, if not it creates the file
     */
    function createDeleteLog(){
        fs.exists('./delete_log.json', function(exists){
            if(!exists){ 
                
                // Root Element of Delete Log 
                var jsonTemplate = {
                    "log" : {}
                }
                fs.writeFileSync('delete_log.json', JSON.stringify(jsonTemplate));
                SMC.getMessage(1,null,`delete_log.json file created`);
            }
        });
    }

// Server Listener
    var server = app.listen(8080, function(){
        var now = new Date().toUTCString();
        var port = server.address().port;

        RM.setDEBUG(false);

        createDeleteLog();

        // Test  #####################################################################################################################################
        //auth.newKey('test@example.com',"0987",function(err, key){
            var key = "684a41985112c92618c737499a";
            var password = "0987";
            


            console.log(`Key: ${key} - Password: ${password}`)
            // Add Data
            auth.authKey(key,password, function(err, res){
                // If Error, log error
                if(err){ 
                    SMC.getMessage(1,5,`Error Authorizing Key: ${err}`); 
                    //
                    //  TO-DO: Return Error
                    //
                }
                // If authorization is successful, update data and last modified field
                else if(res){
                    client.HMSET(key,["Data", JSON.stringify({ "Number" : 4 }) , "Date_Last_Mod" , new Date().valueOf()], function(err){
                        if(err){ console.log(err); }
                    });
                // If authorization in unsuccessful, respond with failure and update key security log for auditing
                } else { 
                    // Report failure to server log
                    SMC.getMessage(1,5,`Incorect Password Entered for Key: ${key}`)
                    // Check if key has existing security hash
                    client.exists(key, function(err, exists){
                        if(err) { console.log(err); }
                        else if(exists){
                            // If security exists, read/write new entry to log
                            client.HGET(key,"Security", function(err, data){
                                if(err){ console.log(`Error updating Security log for ${key}`); }
                                else if(data == null){
                                    var secure = {};
                                    var timestamp = new Date().valueOf();
                                    secure[timestamp] = `Failed Authorization Request - Attempted Password: ${password}`;

                                    client.HSET(key,[
                                                        "Security",JSON.stringify(secure),
                                                        "Date_Last_Mod", new Date().valueOf()
                                                ],function(err){ if(err){ console.log(err) } });
                                } else {
                                    var timestamp = new Date().valueOf();
                                    data = JSON.parse(data);
                                    data[timestamp] = `Failed Authorization Request - Attempted Password: ${password}`;
                                    
                                    client.HSET(key, "Security", JSON.stringify(data), function(err){ if(err){ console.log(err) } });
                                }
                            });
                        }
                    });
                }
            });
        //});
        // #####################################################################################################################################

        SMC.getMessage(0,null,`Server started on port: ${port}`);
    });