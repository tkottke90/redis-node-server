"use strict"

// Import Modules
var express = require('express');
var bparse = require('body-parser');
var fs = require('fs');

var redis = require('redis');

var SMC = require('./Modules/server-message-creator.js')
var RM = require('./Modules/redis-module.js');

// Module Variables
var app = express();
var client = redis.createClient();

// Redis Methods
    /**
     * Method used to start monitoring of Redis DB
     * 
     * - response connection set to close to keep the connection from attempting to re-send the
     */
    app.get('/redis/monitor/start', function(req, res){
        var rm_response = RM.redisMonitor("start");
        res.set('Connection', 'close');
        
        rm_response == "OK" ? res.send('OK') : res.send(rm_response);
    });

    /**
     * Method used to stop monitoring featur in Redis DB
     */
    app.get('/redis/monitor/end', function(req, res){
        
        RM.redisMonitor("shutdown"); 
        res.set('Connection' , 'close');
        res.send('OK')
    });

    app.get(`/redis/get/:key`,function(req,res){
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

// App Methods
app.get('/', function(req, res){
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


// Server Listener
var server = app.listen(8080, function(){
    var now = new Date().toUTCString();
    var port = server.address().port;

    SMC.getMessage(0,null,`Server started on port: ${port}`);
});