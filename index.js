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



var status = ['connected', 'disconnected', 'connecting']
var connectionStatus = "";
var lastSave = 0;

client.monitor(function(err, res){
    SMC.getMessage(1,null,"DB Monitoring Mode Enabled");
});

client.on('error', function(err){
    SMC.getMessage(1,5,"Redis Client Error");
});

client.on('connect', function(){SMC.getMessage(1,null,"Connecting to Redis DB")});

client.on('ready', function(){
    SMC.getMessage(1,null,`Redis Client Connected`);
    RM.init();
    connectionStatus = status[1];
    client.INFO("persistence", function(err, data){
        var output = data.split("\n");
        for(var i = 0; i < output.length; i++){
            console.log(`${i}: ${output[i]}`);
        }
        console.log(RM.redisStats());
    });  
});

client.on('monitor', function(time, args, raw_reply){
    SMC.getMessage(2,null,args);
})


// App Methods
app.get('/', function(req, res){
    SMC.getMessage(0,null,"Connection Check to Node.JS Server");
    var nodeVersion = "v7.6.0";
    console.log(RM.redisStats());
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
            SMC.getMessage(1,0,`Request Completed for key: ${req.params.key}`);
            res.send(data);
        }
    });


});


// Server Listener
var server = app.listen(8080, function(){
    var now = new Date().toUTCString();
    var port = server.address().port;

    client.set('framework',JSON.stringify({
        'name' : 'Node.js',
        'version' : 'v7.6.0'
        }), function(err, reply){
        SMC.getMessage(1,null,`${reply}`);
        if(!err){ client.BGSAVE(); }
    });

    SMC.getMessage(0,null,`Server started on port: ${port}`);
});