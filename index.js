"use strict"

// Import Modules
var express = require('express');
var redis = require('redis');

// Module Variables
var app = express();
var client = redis.createClient();

// Redis Methods
client.monitor(function(err, res){
    console.log(`${new Date().toUTCString()} - [Database] - Entering Monitoring Mode`);
});

client.on('connect', function(){
    console.log(`${new Date().toUTCString()} - [Database] - Redis Client Connected `);
    
    client.INFO("stats", function(err, data){
        console.log(data);
    });   
    
    console.log(`${new Date().toUTCString()} - [Database] - [SET] - Post Request`)
    client.set("framework", "NodeJS", function(err, reply){
        err ? console.log(`${new Date().toUTCString()} - [Database] - [SET] - Error: ${err} `) : console.log(`${new Date().toUTCString()} - [Database] - [SET] - Successful Post `);
    });

});

client.on('monitor', function(time, args, raw_reply){
    console.log(`${new Date().toUTCString()} - [Database-Monitor] - ${args}`);
});


// App Methods
app.get('/', function(req, res){
    console.log(`${new Date().toUTCString()} - [Server] - Hello World!`);
    client.get('framework', function(err, reply){
        console.log(`${new Date().toUTCString()} - [Database] - [GET] - ${reply}`);
    });
    res.send("Hello World!");
});


// Server Listener
var server = app.listen(8080, function(){
    var now = new Date().toUTCString();
    var port = server.address().port;

    console.log(`${now} - [Server] - Server started on port: ${port}`)
});


/**
 * Status Message Reference:
 * 
 * Server Message:
 *      `${new Date().toUTCString()} - [Server] -`
 * 
 * Database Message: 
 *      `${new Date().toUTCString()} - [Database] - `
 *      `${new Date().toUTCString()} - [Database] - [GET] - `
 *      `${new Date().toUTCString()} - [Database] - [SET] - `
 *      `${new Date().toUTCString()} - [Database] - [DELETE] - `
 * 
 *      `${new Date().toUTCString()} - [Database-Monitor] - `
 * 
 * Error Message:
 *      Minor -> `${new Date().toUTCString()} - [Error] - `
 *      Sever -> `${new Date().toUTCString()} - [ERROR] - `
 *      Crash -> `${new Date().toUTCString()} - [Crash] -
 */