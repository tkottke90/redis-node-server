"use strict"

var root = "";

// Import Modules
    var express = require('express');
    var bparse = require('body-parser');
    var fs = require('fs');

    var redis = require('redis');

    var SMC = require('./Modules/server-message-creator.js')
    var RM = require('./Modules/redis-module.js');

// Module Variables
    var app = express();
    app.use(bparse.json());
    var client = RM.client;

// Redis Methods
    /**
     * Method used to start monitoring of Redis DB
     * 
     * - response connection set to close to keep the connection from attempting to re-send the
     */
    app.get(`${root}/redis/monitor/start`, function(req, res){
        var rm_response = RM.redisMonitor("start");
        res.set('Connection', 'close');
        
        rm_response == "OK" ? res.send('OK') : res.send(rm_response);
    });

    /**
     * Method used to stop monitoring featur in Redis DB
     */
    app.get(`${root}/redis/monitor/end`, function(req, res){
        
        RM.redisMonitor("shutdown"); 
        res.set('Connection' , 'close');
        res.send('OK')
    });

    /**
     * Method to get value associated with key from Redis DB
     */
    app.get(`${root}/redis/get/:key`,function(req,res){
        SMC.getMessage(1,0,`request for key: ${req.params.key}`)
        client.get(req.params.key,function(err, data){
            if(err){
                SMC.getMessage(1,5,`Request Error: ${err}`);
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
     *      "overwrite" : <boolean>
     *  }
     * 
     */
    app.put(`${root}/redis/put`, function(req, res){
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
        var overwrite = body.overwrite == "true";

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
    app.post(`${root}/redis/post`, function(req, res){
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
            console.log(`If Values, data[${exists}] & overwrite[${overwrite}]`)

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

        // client.exists(key, function(err, data){
        //     if(data && overwrite){
        //         SMC.getMessage(1,2,"Key Already Exsists/Overwrite false in reqeust");
        //         res.jsonp(409, { error: "Key Already Exists" });
        //     }
        //     else{
        //         client.set(key, value, function(err, data){
        //             if(err){ 
        //                 SMC.getMessage(1,5,"Error Adding Value");
        //                 res.jsonp(500, {error : 'Error Adding Value'});
        //             }
        //         });
        //     }
        // });

    app.delete(`${root}/redis/delete/:id`, function(req, res){

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

// Server Listener
    var server = app.listen(8080, function(){
        var now = new Date().toUTCString();
        var port = server.address().port;

        SMC.getMessage(0,null,`Server started on port: ${port}`);
    });