"use strict"

// Import Modules
var express = require('express');
var redis = require('redis');
var SMC = require('./Modules/server-message-creator.js')

// Module Variables
var app = express();
var client = redis.createClient();

// SMC Methods


// Redis Methods
client.monitor(function(err, res){
    //console.log(`${new Date().toUTCString()} - [Database] - Entering Monitoring Mode`);
    console.log(SMC.getMessage(1,null,"DB Monitoring Mode Enabled"))
});

client.on('connect', function(){
    //console.log(`${new Date().toUTCString()} - [Database] - Redis Client Connected `);
    console.log(SMC.getMessage(1,null,`Redis Client Connected`));

    client.INFO("stats", function(err, data){
        console.log(data);
    });   
});

client.on('monitor', function(time, args, raw_reply){
    //console.log(`${new Date().toUTCString()} - [Database-Monitor] - ${args}`);
    console.log(SMC.getMessage(3,null,args));
});


// App Methods
app.get('/', function(req, res){
    //console.log(`${new Date().toUTCString()} - [Server] - Hello World!`);
    console.log(SMC.getMessage(0,null,"Connected to Node.JS Server"));
    client.get('framework', function(err, reply){
        //console.log(`${new Date().toUTCString()} - [Database] - [GET] - ${reply}`);
        console.log(SMC.getMessage(1,0,`${reply}`));
    });
    res.send("Hello World!");
});


// Server Listener
var server = app.listen(8080, function(){
    var now = new Date().toUTCString();
    var port = server.address().port;

    console.log(SMC.getMessage(0,null,`Server started on port: ${port}`));
});